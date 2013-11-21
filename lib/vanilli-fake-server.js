exports.start = function (config) {

    var bunyan = require('bunyan'),
        restify = require('restify'),
        cors = require('./cors.js'),
        _ = require('lodash'),
        port = config.port,
        stubRegistry = config.stubRegistry,
        log = config.log.child({ component: "vanilla-fake-server" }),
        server;

    if (!port) {
        throw new Error("Fake server port must be specified.");
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

                response.send(stub.respondWith.status, stub.respondWith.entity);

            } else {
                response.send(404, { vanilli: "Stub not found." });
            }

            next();
        }

        log.info("Vanilli Fake Server started on port " + port + ".");

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
