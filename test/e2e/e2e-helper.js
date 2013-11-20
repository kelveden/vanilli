var when = require('when'),
    portfinder = require('portfinder');

require("better-stack-traces").install({
    before: 0,
    after: 0,
    collapseLibraries: true
});

require('chai').Assertion.includeStack = true;

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

/**
 * Assigns two free ports - passing each into the specified success callbacks.
 */
exports.assignPorts = function(apiPortSuccess, fakePortSuccess) {
    return getFreePort()
        .then(apiPortSuccess)
        .then(getFreePort)
        .then(fakePortSuccess);
};

/**
 * "Ending" callback to be passed to the .end function of supertest. Ensures that erroring responses are logged to console
 * for easier diagnosing of test failures.
 *
 * @param done
 *      The 'done' function to call when an error occurs.
 * @param next
 *      The function to call if no error occurs.
 */
exports.ender = function (next) {
    return function (err, res) {
        if (err) {
            throw new Error(err.message + (res ? " | Response: " + JSON.stringify(res.body) : ""));
        }

        next();
    };
};

