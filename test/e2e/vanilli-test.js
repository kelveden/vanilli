var vanilliLogLevel = "error",
    vanilli = require('../../lib/vanilli.js'),
    helper = require('./e2e-helper.js'),
    expect = require('chai').expect,
    chai = require('chai'),
    request = require('supertest');

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

    describe('initialisation', function () {
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

    describe('API', function () {
        var apiClient, vanilliEnvironment;

        beforeEach(function () {
            vanilliEnvironment = vanilli.startVanilli({ apiPort: apiPort, fakePort: fakePort, logLevel: vanilliLogLevel });
            apiClient = request(vanilliEnvironment.apiServer);
        });

        afterEach(function () {
            vanilliEnvironment.stop();
        });

        it('MUST be pingable', function (done) {
            apiClient.get('/ping')
                .expect(200, { ping: "pong" }, done);
        });
    });
});
