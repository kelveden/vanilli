exports.start = function (config) {

    var bunyan = require('bunyan'),
        restify = require('restify'),
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

    server.listen(port, function () {
        server.get('ping', function (request, response, next) {
            response.send({ ping: "pong" });
            return next();
        });

        server.del('/', function (request, response, next) {
            routes.forEach(function (route) {
                vanilliServer.rm(route);
            });
            routes = [];

            response.send(200);
            next();
        });

        server.post('expect', function (request, response, next) {
            var respondWith = request.body.respondWith;

            if (!request.body.criteria.url) {
                response.send(400, "Url must be specified.");

            } else if (respondWith.entity && !respondWith["Content-Type"]) {
                response.send(400, "Content-Type must be specified with a response entity.");

            } else {
                stubRegistry.add(request.body);

                response.send(200);
            }

            return next();
        });

        log.info("Vanilli API started on port " + port + ".");
    });

    return server;
};
