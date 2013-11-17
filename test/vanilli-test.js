var vanilliLogLevel = "error",
    expect = require('chai').expect,
    vanilli = require('../lib/vanilli.js'),
    restify = require('restify'),
    log = require('bunyan').createLogger({
        name: "vanilli-test",
        level: vanilliLogLevel
    });

function createApiClient (vanilliEnvironment) {
    return restify.createJsonClient({
        url: vanilliEnvironment.apiServer.url
    });
};

function createVanilliClient (vanilliEnvironment) {
    return restify.createJsonClient({
        url: vanilliEnvironment.vanilliServer.url
    });
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
            apiClient.get('/ping', function (err, req, res, result) {
                expect(result.ping).to.equal("pong");
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
            apiClient.post('/expect', { respondWith: {
                entity: { something: "else" },
                "Content-Type": "application/json"
            }}, function (err, req, res) {
                expect(res.statusCode).to.equal(400);
                expect(res.body).to.equal("\"Url must be specified.\"");
                done();
            });
        });

        it('cannot be setup with a response entity without a content type', function (done) {
            apiClient.post('/expect', { url: 'my/url', respondWith: {
                entity: { something: "else" }
            }}, function (err, req, res) {
                expect(res.statusCode).to.equal(400);
                expect(res.body).to.equal("\"Content-Type must be specified with a response entity.\"");
                done();
            });
        });

        it('can be setup without a content type when no response entity', function (done) {
            apiClient.post('/expect', { url: 'my/url', respondWith: {
                "Content-Type": "application/json"
            }}, function (err, req, res) {
                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('can be setup to match on a url', function (done) {
            apiClient.post('/expect', { url: '/my/url', respondWith: {
                entity: { something: "else" },
                "Content-Type": "application/json"
            }}, function (err, req, res) {
                expect(res.statusCode).to.equal(200);

                vanilliClient.get('/my/url', function (err, req, res, result) {
                    expect(result.something).to.equal("else");
                    done();
                });
            });
        });
    });
});

