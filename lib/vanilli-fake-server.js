exports.start = function (config) {

    var bunyan = require('bunyan'),
        restify = require('restify'),
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
            throw new Error("No matching stub could be found.");
        }

        return next();
    }

    server = restify.createServer();

    server.listen(port, function () {
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
    });

    return server;
};
