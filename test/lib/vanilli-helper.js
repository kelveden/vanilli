var vanilli = require('../../lib/vanilli.js'),
    restify = require('restify'),
    portfinder = require('portfinder'),
    servers, vanilliPort, apiPort;

portfinder.basePort = 14000;

exports.startVanilli = function(log, done) {
    function findFreePorts(numberOfPorts, callback) {
        function portFound(err, port) {
            if (err) {
                throw new Error(err);
            } else {
                ports.push(port);
                if (ports.length === numberOfPorts) {
                    callback(ports);
                }
            }
        }

        var ports = [], i;

        for (i = 1; i <= numberOfPorts; i++) {
            portfinder.getPort(portFound);
        }
    }

    findFreePorts(2, function (ports) {
        apiPort = ports[0];
        vanilliPort = ports[1];

        servers = vanilli.startServer({ apiPort: apiPort, vanilliPort: vanilliPort, log: log });

        done(servers);
    });
};

exports.stopVanilli = function() {
    try {
        servers.closeAll();
    } catch (e) {}
};

exports.createApiClient = function () {
    return restify.createJsonClient({
        url: 'http://localhost:' + apiPort
    });
};

exports.createVanilliClient = function () {
    return restify.createJsonClient({
        url: 'http://localhost:' + vanilliPort
    });
};

