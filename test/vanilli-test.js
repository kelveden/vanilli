var expect = require('chai').expect,
    vanilli = require('../lib/vanilli.js'),
    vanilliHelper = require('./lib/vanilli-helper.js'),
    log = require('bunyan').createLogger({
        name: "vanilli-test",
        level: "error"
    });

describe('Vanilli', function () {
    it('throws an error if no api port specified', function () {
        expect(function () {
            vanilli.startServer({ apiPort: 1234 });
        })
            .to.throw(/vanilliPort not specified/);
    });

    it('throws an error if no vanilli port specified', function () {
        expect(function () {
            vanilli.startServer({ vanilliPort: 1234 });
        })
            .to.throw(/apiPort not specified/);
    });

    describe('API', function () {
        var apiClient;

        before(function (done) {
            vanilliHelper.startVanilli(log, function () {
                apiClient = vanilliHelper.createApiClient();
                done();
            });
        });

        after(function () {
            vanilliHelper.stopVanilli();
        });

        it('should be pingable', function (done) {
            apiClient.get('/ping', function (err, req, res, result) {
                expect(result.ping).to.equal("pong");
                done();
            });
        });
    });

    describe('expectations', function () {
        var vanilliClient, apiClient;

        before(function (done) {
            vanilliHelper.startVanilli(log, function () {
                apiClient = vanilliHelper.createApiClient();
                vanilliClient = vanilliHelper.createVanilliClient();
                done();
            });
        });

        after(function () {
            vanilliHelper.stopVanilli();
        });

        beforeEach(function (done) {
            apiClient.del('/', function () {
                done();
            });
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

