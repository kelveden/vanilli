exports.start = function (config) {

    var bunyan = require('bunyan'),
        restify = require('restify'),
        cors = require('./cors.js'),
        port = config.port,
        stubRegistry = config.stubRegistry,
        log = config.log.child({ component: "vanilla-api-server" }),
        server;

    if (!port) {
        throw new Error("API server port must be specified.");
    }

    if (!stubRegistry) {
        throw new Error("Stub Registry must be specified.");
    }

    server = restify.createServer();
    server.use(restify.bodyParser({ mapParams: false }));
    server.use(cors.configure());

    server.listen(port, function () {
        server.get('ping', function (request, response, next) {
            response.send({ ping: "pong" });
            return next();
        });

        server.opts('expect', function (request, response, next) {
            response.send(200);
            next();
        });

        server.del('expect', function (request, response, next) {
            routes.forEach(function (route) {
                vanilliServer.rm(route);
            });
            routes = [];

            response.send(200);
            next();
        });

        server.post('expect', function (request, response, next) {
            try {
                stubRegistry.add(request.body);
                response.send(200);

            } catch (e) {
                response.send(400, e.message);
            }

            return next();
        });

        log.info("Vanilli API started on port " + port + ".");
    });

    return server;
};
