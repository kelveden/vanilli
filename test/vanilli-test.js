var vanilliLogLevel = "error",
    expect = require('chai').expect,
    vanilli = require('../lib/vanilli.js'),
    chai = require('chai'),
    chaiHttp = require('chai-http'),
    log = require('bunyan').createLogger({
        name: "vanilli-test",
        level: vanilliLogLevel
    });

chai.use(chaiHttp);

function createApiClient(vanilliEnvironment) {
    return chai.request(vanilliEnvironment.apiServer.url);
};

function createVanilliClient(vanilliEnvironment) {
    return chai.request(vanilliEnvironment.vanilliServer.url);
};

describe('Vanilli', function () {
    describe('initialisation', function () {
        it('selects the first available port as the vanilli port if not explicitly specified', function (done) {
            vanilli.startServer({ apiPort: 1234, log: log }).then(function (vanilliEnvironment) {
                expect(vanilliEnvironment.vanilliServer.url).to.exist;
                vanilliEnvironment.stop();
                done();
            });
        });

        it('selects the first available port as the api port if not explicitly specified', function (done) {
            vanilli.startServer({ vanilliPort: 1234, log: log }).then(function (vanilliEnvironment) {
                expect(vanilliEnvironment.apiServer.url).to.exist;
                vanilliEnvironment.stop();
                done();
            });
        });
    });

    describe('API', function () {
        var apiClient, vanilliEnvironment;

        beforeEach(function (done) {
            vanilli.startServer({ log: log }).then(function (environment) {
                vanilliEnvironment = environment;
                apiClient = createApiClient(environment);
                done();
            });
        });

        afterEach(function () {
            vanilliEnvironment.stop();
        });

        it('should be pingable', function (done) {
            apiClient.get('/ping').res(function (result) {
                expect(result).to.be.json;
                expect(result.body.ping).to.be.equal("pong");
                done();
            });
        });
    });

    describe('expectations', function () {
        var vanilliClient, apiClient, vanilliEnvironment;

        beforeEach(function (done) {
            vanilli.startServer({ log: log }).then(function (environment) {
                vanilliEnvironment = environment;
                apiClient = createApiClient(environment);
                vanilliClient = createVanilliClient(environment);
                done();
            });
        });

        afterEach(function () {
            vanilliEnvironment.stop();
        });

        it('cannot be setup without a url', function (done) {
            apiClient.post('/expect')
                .req(function (req) {
                    req.send({
                        respondWith: {
                            entity: { something: "else" },
                            "Content-Type": "application/json"
                        }
                    });
                })
                .res(function (res) {
                    expect(res).to.have.status(400);
                    expect(res.body).to.equal("Url must be specified.");
                    done();
                });
        });

        it('cannot be setup with a response entity without a content type', function (done) {
            apiClient.post('/expect')
                .req(function (req) {
                    req.send({
                        url: 'my/url',
                        respondWith: {
                            entity: { something: "else" }
                        }
                    });
                })
                .res(function (res) {
                    expect(res).to.have.status(400);
                    expect(res.body).to.equal("Content-Type must be specified with a response entity.");
                    done();
                });
        });

        it('can be setup without a content type when no response entity', function (done) {
            apiClient.post('/expect')
                .req(function (req) {
                    req.send({
                        url: 'my/url',
                        respondWith: {
                            "Content-Type": "application/json"
                        }
                    });
                })
                .res(function (res) {
                    expect(res).to.have.status(200);
                    done();
                });
        });

        it('can be setup to match on a url', function (done) {
            apiClient.post('/expect')
                .req(function (req) {
                    req.send({
                        url: '/my/url',
                        respondWith: {
                            entity: { something: "else" },
                            "Content-Type": "application/json"
                        }
                    });
                })
                .res(function (res) {
                    expect(res).to.have.status(200);

                    vanilliClient.get('/my/url')
                        .res(function (result) {
                            expect(result.body.something).to.equal("else");
                            done();
                        });
                });
        });
    });
});

