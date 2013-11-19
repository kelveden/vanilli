var when = require('when'),
    portfinder = require('portfinder');

portfinder.basePort = 14000;

function getFreePort() {
    var deferred = when.defer();

    portfinder.getPort(function (err, port) {
        if (err) {
            deferred.reject(err);
        } else {
            portfinder.basePort = port + 1;
            deferred.resolve(port);
        }
    });

    return deferred.promise;
}

exports.assignPorts = function(apiPortSuccess, fakePortSuccess) {
    return getFreePort()
        .then(apiPortSuccess)
        .then(getFreePort)
        .then(fakePortSuccess);
};
