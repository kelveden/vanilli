var bunyan = require('bunyan'),
    restify = require('restify'),
    cors = require('./cors.js'),
    _ = require('lodash'),
    server, log;

exports.start = function (config) {
    var port = config.port,
        stubRegistry = require('./stub-registry.js').create(config.log);

    log = config.log.child({ component: "vanilli-server" });

    if (!port) {
        throw new Error("Port must be specified.");
    }

    if (!stubRegistry) {
        throw new Error("Stub Registry must be specified.");
    }

    server = restify.createServer();
    server.use(restify.bodyParser({ mapParams: false }));
    server.use(cors.configure({ allowedHeadersForCors: config.allowedHeadersForCors }));
    server.use(restify.queryParser());

    server.listen(port, function () {
        function respondTo(request, response, next) {
            var stub = stubRegistry.findMatchFor(request);

            if (stub) {
                response.header('Content-Type', stub.respondWith.contentType);

                if (stub.respondWith.headers) {
                    _.keys(stub.respondWith.headers).forEach(function (header) {
                        response.header(header, stub.respondWith.headers[header]);
                    });
                }

                response.send(stub.respondWith.status, stub.respondWith.body);

            } else {
                log.error("UNEXPECTED request: " + request.method + " " + request.url);

                response.send(404, { vanilli: "Stub not found." });
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

        function createCorsSupportingOptsMethodFor(url) {
            server.opts(url, function (request, response, next) {
                response.send(200);
                next();
            });
        }

        log.info("Vanilli Server started on port " + port + ".");

        server.get('_vanilli/ping', function (request, response, next) {
            response.send({ ping: "pong" });
            return next();
        });

        createCorsSupportingOptsMethodFor('_vanilli/stubs');
        server.del('_vanilli/stubs', function (request, response, next) {
            stubRegistry.clear();
            response.send(200);
            next();
        });

        createCorsSupportingOptsMethodFor('_vanilli/stubs');
        server.post('_vanilli/stubs', function (request, response, next) {
            try {
                response.send(200, addToRegistry(request));

            } catch (e) {
                response.send(400, e.message);
            }

            return next();
        });

        createCorsSupportingOptsMethodFor('_vanilli/stubs/verification');
        server.get('_vanilli/stubs/verification', function (request, response, next) {
            try {
                response.send(200, { errors: stubRegistry.verifyExpectations() });

            } catch (e) {
                response.send(400, e.message);
            }

            return next();
        });

        createCorsSupportingOptsMethodFor('_vanilli/captures');
        server.get('_vanilli/captures/:captureId', function (request, response, next) {
            try {
                var capture = stubRegistry.getCapture(request.params.captureId);

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

        server.get(/.*/, function (request, response, next) {
            respondTo(request, response, next);
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

    return server;
};

exports.stop = function () {
    server.close();
    log.info("Vanilli Server stopped.");
};