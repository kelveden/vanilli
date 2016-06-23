var restify = require('restify'),
    cors = require('./cors.js'),
    placeholderManager = require('./placeholder-manager.js'),
    _ = require('lodash'),
    minimatch = require('minimatch'),
    server, log;

exports.start = function (config) {
    function createStaticServer(config) {
        if (config.static && config.static.root) {
            var serverConfig = {
                "default" : config.static.default || "index.html",

                include: (config.static.include || []).map(function includeProxyRoutes( resource ) {
                    var isProxyRoute = _.isObject(resource);
                    return isProxyRoute ? resource.path : resource;
                }),
                exclude: config.static.exclude || [],
                proxyRoutes: (config.static.include || []).filter(_.isObject)
            };

            serverConfig.serve = restify.serveStatic({
                directory: config.static.root,
                "default": serverConfig.default
            });

            log.debug("Serving up static content with configuration", config.static);

            return serverConfig;
        }
    }

    log = config.log;

    var port = config.port,
        stubRegistry = config.registry,
        staticServer = createStaticServer(config);

    if (!port) {
        throw new Error("Port must be specified.");
    }

    if (!stubRegistry) {
        throw new Error("Stub Registry must be specified.");
    }

    server = restify.createServer();
    server.use(restify.bodyParser({ mapParams: false }));
    server.use(cors.configure());
    server.use(restify.queryParser());
    server.use(restify.jsonp());

    server.listen(port, function () {
        function respondTo(request, response, next) {
            var contentType, stub;

            function completeResponseWith(response, stub) {
                var contentType = response.header('Content-Type'),
                    contentFormatterExists = server.formatters[contentType],
                    body = placeholderManager.substitute(request, stub.response.body);

                if (body && !contentFormatterExists) {
                    response.writeHead(stub.response.status, {
                        'Content-Length': Buffer.byteLength(body),
                        'Content-Type': contentType
                    });

                    response.write(body);
                    response.end();
                } else {
                    response.send(stub.response.status, body);
                }
            }

            try {
                stub = stubRegistry.findMatchFor(request);

                if (stub) {
                    contentType = response.header('Content-Type') || stub.response.contentType;

                    if (stub.response.headers) {
                        _.keys(stub.response.headers)
                            .filter(function (header) {
                                return (header.toLowerCase() !== "content-type");
                            })
                            .forEach(function (header) {
                                response.header(header, stub.response.headers[header]);
                            });
                    }

                    if (contentType) {
                        response.setHeader('Content-Type', contentType);
                    }

                    if (stub.response.wait) {
                        setTimeout(function () {
                            completeResponseWith(response, stub);
                        }, stub.response.wait);
                    } else {
                        completeResponseWith(response, stub);
                    }

                } else {
                    log.warn("UNEXPECTED request: " + request.method + " " + request.url);

                    response.send(404, { vanilli: "Stub not found." });
                }

            } catch (e) {
                log.error(e);
            }

            next();
        }

        function addToRegistry(request) {
            if (_.isArray(request.body)) {
                return request.body.map(function (stub) {
                    return stubRegistry.addStub(stub).id;
                });
            } else {
                return [ stubRegistry.addStub(request.body).id ];
            }
        }

        log.info("Vanilli Server started on port " + port + ".");

        server.get('_vanilli/ping', function (request, response, next) {
            response.send({ ping: "pong" });
            return next();
        });

        server.del('_vanilli/stubs', function (request, response, next) {
            stubRegistry.clear();
            response.send(200);
            next();
        });

        server.post('_vanilli/stubs', function (request, response, next) {
            try {
                response.send(200, addToRegistry(request));

            } catch (e) {
                response.send(400, e.message);
            }

            return next();
        });

        server.get('_vanilli/verify', function (request, response, next) {
            try {
                response.send(200, { errors: stubRegistry.verifyExpectations() });

            } catch (e) {
                response.send(400, e.message);
            }

            return next();
        });

        server.get('_vanilli/captures/:captureId', function (request, response, next) {
            try {
                var capture = stubRegistry.getCaptures(request.params.captureId);

                if (capture) {
                    response.send(200, capture);
                } else {
                    response.send(404, "Not found");
                }

            } catch (e) {
                response.send(400, e.message);
            }

            return next();
        });

        server.get('_vanilli/dump', function (request, response, next) {
            response.send(200, stubRegistry.dump());
            return next();
        });

        server.get(/.*/, function (request, response, next) {
            function isRequestForStaticContent(request) {
                if (staticServer) {
                    var url = request.url,
                        matchesUrl = _.partial(minimatch, url);

                    return ((url === "/") || (url.length === 0)) ||
                        (((staticServer.include.length === 0) || (staticServer.include.some(matchesUrl))) &&
                            ((staticServer.exclude.length === 0) || (!staticServer.exclude.some(matchesUrl))));
                }
            }

            function proxyRouteToStatic(request) {
                var matchedRoute = _.find(staticServer.proxyRoutes, function ( route ) {
                        return minimatch( request.url, route.path );
                    }) || {},
                    routeTarget = matchedRoute.useDefault ? staticServer.default : matchedRoute.target;

                if ( routeTarget ) {
                    request.url = routeTarget;
                }
            }

            if (isRequestForStaticContent(request)) {
                proxyRouteToStatic(request);
                staticServer.serve(request, response, next);
                log.info("SERVED request " + request.method + " " + request.url + " from static content.");
            } else {
                respondTo(request, response, next);
            }
        });

        server.del(/.*/, function (request, response, next) {
            respondTo(request, response, next);
        });

        server.put(/.*/, function (request, response, next) {
            respondTo(request, response, next);
        });

        server.post(/.*/, function (request, response, next) {
            respondTo(request, response, next);
        });

        server.head(/.*/, function (request, response, next) {
            respondTo(request, response, next);
        });

        server.opts(/.*/, function (request, response, next) {
            response.send(200);
            next();
        });
    });

    return this;
};

exports.stop = function () {
    server.close();
    log.info("Vanilli Server stopped.");
};
