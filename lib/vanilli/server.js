var restify = require('restify'),
    cors = require('./cors.js'),
    placeholderManager = require('./placeholder-manager.js'),
    _ = require('lodash'),
    minimatch = require('minimatch'),
    server, log;

exports.start = function (config) {
    function createStaticServer(config) {
        if (config.static) {
            return  {
                serve: restify.serveStatic({
                    directory: config.static.root,
                    "default": config.static.default || "index.html"
                }),
                include: config.static.include || [],
                exclude: config.static.exclude || []
            };
        }
    }

    var port = config.port,
        stubRegistry = config.registry,
        staticServer = createStaticServer(config);

    log = config.log;

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
                        response.header('Content-Type', contentType);
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

        log.info("Vanilli Server started on port " + port + ".");

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

            if (isRequestForStaticContent(request)) {
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
