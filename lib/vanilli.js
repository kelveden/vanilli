var bunyan = require('bunyan'),
    vanilliServer = require('./vanilli-server.js'),
    _ = require('lodash');

exports.start = function (config) {
    config.log = bunyan.createLogger({
        name: "vanilli",
        level: config.logLevel || "error"
    });

    return vanilliServer.start(config);
};

exports.stop = function () {
    vanilliServer.stop();
};

