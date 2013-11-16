var portfinder = require('portfinder');
portfinder.basePort = 14000;

exports.findFreePorts = function (numberOfPorts, callback) {

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
};
