var vanilliLogLevel = "error",
    vanilli = require('../../lib/vanilli.js'),
    expect = require('chai').expect,
    chai = require('chai'),
    portfinder = require('portfinder'),
    when = require('when'),
    request = require('supertest');

function createApiClient(vanilliEnvironment) {
    return request(vanilliEnvironment.apiServer);
}

function createFakeClient(vanilliEnvironment) {
    return request(vanilliEnvironment.fakeServer);
}

function getFreePort() {
    var deferred = when.defer();

    portfinder.getPort(function (err, port) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(port);
        }
    });

    return deferred.promise;
}

describe('The Vanilli server', function () {
    var apiPort, fakePort;

    before(function (done) {
        portfinder.basePort = 14000;

        getFreePort()
            .then(function (port) {
                apiPort = port;
                portfinder.basePort = apiPort + 1;
            })
            .then(getFreePort)
            .then(function (port) {
                fakePort = port;
            })
            .then(done);
    });

    describe('initialisation', function () {
        it('throws an error if the fake port is not explicitly specified', function () {
            expect(function () {
                vanilli.startVanilli({ apiPort: 1234, logLevel: vanilliLogLevel });
            })
                .to.throw(/Fake server port must be specified/);
        });

        it('throws an error if the api port is not explicitly specified', function () {
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
            apiClient = createApiClient(vanilliEnvironment);
        });

        afterEach(function () {
            vanilliEnvironment.stop();
        });

        it('should be pingable', function (done) {
            apiClient.get('/ping')
                .expect(200, { ping: "pong" }, done);
        });
    });

    describe('expectations', function () {
        var fakeClient, apiClient, vanilliEnvironment;

        beforeEach(function () {
            vanilliEnvironment = vanilli.startVanilli({ apiPort: apiPort, fakePort: fakePort, logLevel: vanilliLogLevel });
            apiClient = createApiClient(vanilliEnvironment);
            fakeClient = createFakeClient(vanilliEnvironment);
        });

        afterEach(function () {
            vanilliEnvironment.stop();
        });

        it('cannot be setup without a url', function (done) {
            apiClient.post('/expect')
                .set('Content-Type', 'application/json')
                .send({
                    criteria: {
                    },
                    respondWith: {
                        entity: { something: "else" },
                        "Content-Type": "application/json"
                    }
                })
                .expect(400, /url/, done);
        });

        it('cannot be setup with a response entity without a content type', function (done) {
            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: 'my/url'
                    },
                    respondWith: {
                        status: 200,
                        entity: {
                            something: "else"
                        }
                    }
                })
                .expect(400, /contentType/, done);
        });

        it('can be setup without a content type when no response entity', function (done) {
            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: 'my/url'
                    },
                    respondWith: {
                        status: 200
                    }
                })
                .expect(200, done);
        });

        it('can be setup to match on a url', function (done) {
            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: 'my/url'
                    },
                    respondWith: {
                        status: 200,
                        entity: {
                            something: "else"
                        },
                        contentType: "application/json"
                    }
                })
                .expect(200)
                .end(function (err) {
                    if (err) return done(err);

                    fakeClient.get('/my/url')
                        .expect({ something: "else" }, done);
                });
        });
    });
});

