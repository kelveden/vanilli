var bunyan = require('bunyan'),
    vanilliServer = require('./vanilli-server.js');

exports.startVanilli = function (config) {

    var log = bunyan.createLogger({
            name: "vanilli",
            level: config.logLevel || "error"
        }),
        stubRegistry = require('./stub-registry.js').create(log);

    return vanilliServer.start({ port: config.port, log: log, stubRegistry: stubRegistry });
};

