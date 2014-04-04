var bunyan = require('bunyan'),
    vanilliServer = require('./vanilli-server.js');

exports.start = function (config) {
    var log = bunyan.createLogger({
            name: "vanilli",
            level: config.logLevel || "error"
        });

    return vanilliServer.start({
        port: config.port,
        allowedHeadersForCors: config.allowedHeadersForCors,
        log: log
    });
};

exports.stop = function () {
    vanilliServer.stop();
};

