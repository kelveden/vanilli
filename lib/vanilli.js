var http = require('http'),
    restify = require('restify'),
    when = require('when');

exports.startServer = function (config) {

    if (!config.apiPort) {
        throw new Error("api port must be specified.");
    }

    if (!config.vanilliPort) {
        throw new Error("vanilli port must be specified.");
    }

    function getLog() {
        if (config.log) {
            return config.log;
        } else {
            return require('bunyan').createLogger({ name: "vanilli" });
        }
    }

    function createApiServerOnPort(port) {
        var server = restify.createServer();

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

                if (!request.body.url) {
                    response.send(400, "Url must be specified.");
                } else if (respondWith.entity && !respondWith["Content-Type"]) {
                    response.send(400, "Content-Type must be specified with a response entity.");
                } else {
                    routes.push(vanilliServer.get(request.body.url, function (request, response, next) {
                        response.send(respondWith.entity);
                        return next();
                    }));

                    response.send(200);
                }

                return next();
            });

            log.info("Vanilli API started on port " + port + ".");
        });

        return server;
    }

    function createVanilliServerOnPort(port) {
        var server = restify.createServer();

        server.listen(port, function () {
            log.info("Vanilli Server started on port " + port + ".");
        });

        return server;
    }

    var log = getLog(),
        routes = [],
        vanilliServer = createVanilliServerOnPort(config.vanilliPort),
        apiServer = createApiServerOnPort(config.apiPort);

    return {
        apiServer: apiServer,
        vanilliServer: vanilliServer,
        stop: function () {
            this.apiServer.close();
            this.vanilliServer.close();
        }
    };
};

