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

    validateConfig();

    var apiServer = restify.createServer(),
        vanilliServer = restify.createServer(),
        log = getLog();

    apiServer.listen(config.apiPort, function () {
        apiServer.get('ping', function (request, response, next) {
            response.send({ ping: "pong" });
            return next();
        });

        log.info("Vanilli API started on port " + config.apiPort + ".");
    });

    vanilliServer.listen(config.vanilliPort, function () {
        vanilliServer.get('ping', function (request, response, next) {
            response.send({ ping: "pong" });
            return next();
        });

        log.info("Vanilli Server started on port " + config.vanilliPort + ".");
    });

    return {
        apiServer: apiServer,
        vanilliServer: vanilliServer,
        closeAll: function () {
            apiServer.close();
            vanilliServer.close();
        }
    };
};

