exports.start = function (config) {

    var bunyan = require('bunyan'),
        restify = require('restify'),
        cors = require('./cors.js'),
        _ = require('lodash'),
        port = config.port,
        stubRegistry = config.stubRegistry,
        log = config.log.child({ component: "vanilla-server" }),
        server;

    if (!port) {
        throw new Error("Port must be specified.");
    }

    if (!stubRegistry) {
        throw new Error("Stub Registry must be specified.");
    }

    server = restify.createServer();
    server.use(restify.bodyParser({ mapParams: false }));
    server.use(cors.configure());

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
                response.send(404, { vanilli: "Stub not found." });
            }

            next();
        }

        log.info("Vanilli Server started on port " + port + ".");

        server.get('_vanilli/ping', function (request, response, next) {
            response.send({ ping: "pong" });
            return next();
        });

        server.opts('_vanilli/expect', function (request, response, next) {
            response.send(200);
            next();
        });

        server.del('_vanilli/expect', function (request, response, next) {
            stubRegistry.clear();
            response.send(200);
            next();
        });

        server.post('_vanilli/expect', function (request, response, next) {
            function buildResponse() {
                if (_.isArray(request.body)) {
                    return request.body.map(function (stub) {
                        return stubRegistry.add(stub).id;
                    });
                } else {
                    return [ stubRegistry.add(request.body).id ];
                }
            }

            try {
                response.send(200, buildResponse());

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
