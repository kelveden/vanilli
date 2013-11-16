exports.startServer = function (config) {
    var http = require('http'),
        log = require('bunyan').createLogger({ name: "vanilli" }),
        restify = require('restify'),
        apiServer = restify.createServer(),
        vanilliServer = restify.createServer();

    apiServer.listen(config.apiPort, function () {
        apiServer.get('ping', function (request, response, next) {
            response.send({ ping: "pong" });
            return next();
        });

        log.info("Vanilli API started on port " + config.apiPort + ".");
    });

    vanilliServer.listen(config.serverPort, function () {
        vanilliServer.get('ping', function (request, response, next) {
            response.send({ ping: "pong" });
            return next();
        });

        log.info("Vanilli Server started on port " + config.serverPort + ".");
    });

    return {
        apiServer: apiServer,
        vanilliServer: vanilliServer,
        closeAll: function () {
            apiServer.close();
            vanilliServer.close();
        }
    }
}

