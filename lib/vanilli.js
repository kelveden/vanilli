var bunyan = require('bunyan'),
    vanilliApiServer = require('./vanilli-api-server.js'),
    vanilliFakeServer = require('./vanilli-fake-server.js');

exports.startVanilli = function (config) {

    var log = bunyan.createLogger({
            name: "vanilli",
            level: config.logLevel || "error"
        }),
        stubRegistry = require('./stub-registry.js').create(log);

    return {
        apiServer: vanilliApiServer.start({ port: config.apiPort, log: log, stubRegistry: stubRegistry }),
        fakeServer: vanilliFakeServer.start({ port: config.fakePort, log: log, stubRegistry: stubRegistry }),
        stop: function () {
            this.apiServer.close();
            this.fakeServer.close();
        }
    };
};

