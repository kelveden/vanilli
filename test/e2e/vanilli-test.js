/* jshint expr:true */
var vanilliLogLevel = "error",
    vanilli = require('../../lib/vanilli.js'),
    helper = require('./e2e-helper.js'),
    chai = require('chai'),
    expect = chai.expect;

chai.use(require('chai-http'));

describe('Vanilli', function () {
    var apiPort, fakePort;

    before(function (done) {
        helper.assignPorts(
            function (port) {
                apiPort = port;
            }, function (port) {
                fakePort = port;
            })
            .then(done);
    });

    it('MUST throw an error if the fake port is not explicitly specified', function () {
        expect(function () {
            vanilli.startVanilli({ apiPort: 1234, logLevel: vanilliLogLevel });
        })
            .to.throw(/Fake server port must be specified/);
    });

    it('MUST throw an error if the api port is not explicitly specified', function () {
        expect(function () {
            vanilli.startVanilli({ fakePort: 1234, logLevel: vanilliLogLevel });
        })
            .to.throw(/API server port must be specified/);
    });
});
