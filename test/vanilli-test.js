var vanilliLogLevel = "error",
    vanilli = require('../lib/vanilli.js'),
    expect = require('chai').expect,
    chai = require('chai'),
    portfinder = require('portfinder'),
    when = require('when'),
    request = require('supertest'),
    log = require('bunyan').createLogger({
        name: "vanilli-test",
        level: vanilliLogLevel
    });

function createApiClient(vanilliEnvironment) {
    return request(vanilliEnvironment.apiServer);
};

function createVanilliClient(vanilliEnvironment) {
    return request(vanilliEnvironment.vanilliServer);
};

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

describe('Vanilli', function () {
    var apiPort, vanilliPort;

    before(function (done) {
        portfinder.basePort = 14000;

        getFreePort()
            .then(function (port) {
                apiPort = port;
                portfinder.basePort = apiPort + 1;
            })
            .then(getFreePort)
            .then(function (port) {
                vanilliPort = port;
            })
            .then(done);
    });

    describe('initialisation', function () {
        it('throws an error if the vanilli port is not explicitly specified', function () {
            expect(function () {
                vanilli.startServer({ apiPort: 1234, log: log });
            })
                .to.throw(/vanilli port must be specified/);
        });

        it('throws an error if the api port is not explicitly specified', function () {
            expect(function () {
                vanilli.startServer({ vanillaPort: 1234, log: log });
            })
                .to.throw(/api port must be specified/);
        });
    });

    describe('API', function () {
        var apiClient, vanilliEnvironment;

        beforeEach(function () {
            vanilliEnvironment = vanilli.startServer({ log: log, apiPort: apiPort, vanilliPort: vanilliPort });
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
        var vanilliClient, apiClient, vanilliEnvironment;

        beforeEach(function () {
            vanilliEnvironment = vanilli.startServer({ log: log, apiPort: apiPort, vanilliPort: vanilliPort });
            apiClient = createApiClient(vanilliEnvironment);
            vanilliClient = createVanilliClient(vanilliEnvironment);
        });

        afterEach(function () {
            vanilliEnvironment.stop();
        });

        it('cannot be setup without a url', function (done) {
            apiClient.post('/expect')
                .set('Content-Type', 'application/json')
                .send({
                    respondWith: {
                        entity: { something: "else" },
                        "Content-Type": "application/json"
                    }
                })
                .expect(400, "\"Url must be specified.\"", done);
        });

        it('cannot be setup with a response entity without a content type', function (done) {
            apiClient.post('/expect')
                .send({
                    url: 'my/url',
                    respondWith: {
                        entity: { something: "else" }
                    }
                })
                .expect(400, "\"Content-Type must be specified with a response entity.\"", done);
        });

        it('can be setup without a content type when no response entity', function (done) {
            apiClient.post('/expect')
                .send({
                    url: 'my/url',
                    respondWith: {
                        "Content-Type": "application/json"
                    }
                })
                .expect(200, done);
        });

        it('can be setup to match on a url', function (done) {
            apiClient.post('/expect')
                .send({
                        url: '/my/url',
                        respondWith: {
                            entity: { something: "else" },
                            "Content-Type": "application/json"
                        }
                    })
                .expect(200)
                .end(function (err) {
                    if (err) return done(err);

                    vanilliClient.get('/my/url')
                        .expect({ something: "else" }, done);
                });
        });
    });
});

