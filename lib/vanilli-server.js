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

        function addToRegistry(request, adder) {
            if (_.isArray(request.body)) {
                return request.body.map(function (stub) {
                    return adder(stub).id;
                });
            } else {
                return [ adder(request.body).id ];
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

        createCorsSupportingOptsMethodFor('_vanilli/registry');
        server.del('_vanilli/registry', function (request, response, next) {
            stubRegistry.clear();
            response.send(200);
            next();
        });

        createCorsSupportingOptsMethodFor('_vanilli/stub');
        server.post('_vanilli/stub', function (request, response, next) {
            try {
                response.send(200, addToRegistry(request, stubRegistry.addStub));

            } catch (e) {
                response.send(400, e.message);
            }

            return next();
        });

        createCorsSupportingOptsMethodFor('_vanilli/expect');
        server.post('_vanilli/expect', function (request, response, next) {
            try {
                response.send(200, addToRegistry(request, stubRegistry.addExpectation));

            } catch (e) {
                response.send(400, e.message);
            }

            return next();
        });

        createCorsSupportingOptsMethodFor('_vanilli/expect/verification');
        server.get('_vanilli/expect/verification', function (request, response, next) {
            try {
                response.send(200, { errors: stubRegistry.verifyExpectations() });

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
