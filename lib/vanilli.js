var http = require('http'),
    restify = require('restify'),
    portfinder = require('portfinder'),
    when = require('when');

portfinder.basePort = 14000;

exports.startServer = function (config) {
    var log = getLog(),
        routes = [],
        vanilliServer;

    function getLog() {
        if (config.log) {
            return config.log;
        } else {
            return require('bunyan').createLogger({ name: "vanilli" });
        }
    }

    function assignPort(configPort) {
        if (configPort) {
            return when.resolve(configPort);

        } else {
            var deferred = when.defer();

            portfinder.getPort(function (err, port) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(port);
                }
            });

            return deferred.promise;
        }
    }

    function createApiServerOnPort(port) {
        var apiServer = restify.createServer();

        apiServer.use(restify.bodyParser({ mapParams: false }));

        apiServer.listen(port, function () {
            apiServer.get('ping', function (request, response, next) {
                response.send({ ping: "pong" });
                return next();
            });

            apiServer.del('/', function (request, response, next) {
                routes.forEach(function (route) {
                    vanilliServer.rm(route);
                });
                routes = [];

                response.send(200);
                next();
            });

            apiServer.post('expect', function (request, response, next) {
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

        return when.resolve(apiServer);
    }

    function createVanilliServerOnPort(port) {
        var vanilliServer = restify.createServer();

        vanilliServer.listen(port, function () {
            log.info("Vanilli Server started on port " + port + ".");
        });

        return when.resolve(vanilliServer);
    }

    return when.all([
            assignPort(config.apiPort).then(createApiServerOnPort),
            assignPort(config.vanilliPort).then(createVanilliServerOnPort)
        ]).then(function (servers) {
            vanilliServer = servers[1];

            return {
                apiServer: servers[0],
                vanilliServer: vanilliServer,
                stop: function () {
                    this.apiServer.close();
                    this.vanilliServer.close();
                }
            };
        });
};

