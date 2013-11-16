var http = require('http'),
    restify = require('restify');

exports.startServer = function (config) {
    function validateConfig() {
        if (!config.apiPort) {
            throw new Error("apiPort not specified.");
        }

        if (!config.vanilliPort) {
            throw new Error("vanilliPort not specified.");
        }
    }

    function getLog() {
        if (config.log) {
            return config.log;
        } else {
            return require('bunyan').createLogger({ name: "vanilli" });
        }
    }

    function startVanilli() {
        vanilliServer.listen(config.vanilliPort, function () {
            log.info("Vanilli Server started on port " + config.vanilliPort + ".");
        });
    }

    validateConfig();

    var apiServer = restify.createServer(),
        vanilliServer = restify.createServer(),
        log = getLog(),
        routes = [];

    apiServer.use(restify.bodyParser({ mapParams: false }));

    apiServer.listen(config.apiPort, function () {
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

        log.info("Vanilli API started on port " + config.apiPort + ".");
    });

    startVanilli();

    return {
        apiServer: apiServer,
        vanilliServer: vanilliServer,
        closeAll: function () {
            apiServer.close();
            vanilliServer.close();
        }
    };
};

