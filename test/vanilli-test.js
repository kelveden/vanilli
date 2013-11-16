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
            vanilliHelper.start(log, function () {
                apiClient = vanilliHelper.createApiClient();
                done();
            });
        });

        after(function () {
            vanilliHelper.stop();
        });

        it('should be pingable', function (done) {
            apiClient.get('/ping', function (err, req, res, result) {
                expect(result.ping).to.equal("pong");
                done();
            });
        });
    });

    describe('Server', function () {
        var vanilliClient;

        before(function (done) {
            vanilliHelper.start(log, function () {
                vanilliClient = vanilliHelper.createVanilliClient();
                done();
            });
        });

        after(function () {
            vanilliHelper.stop();
        });

        it('should be pingable', function (done) {
            vanilliClient.get('/ping', function (err, req, res, result) {
                expect(result.ping).to.equal("pong");
                done();
            });
        });
    });
});

