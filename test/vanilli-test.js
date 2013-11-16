var expect = require('expect.js'),
    vanilli = require('../vanilli.js'),
    restify = require('restify'),
    log = require('bunyan').createLogger({ name: "vanilli-test" });

describe('vanilli', function () {
    before(function () {
        this.server = vanilli.startServer(8081);
        this.client = restify.createJsonClient({
            url: 'http://localhost:8081'
        });
    });

    after(function () {
        this.server.close();
    });

    it('should be pingable', function (done) {
        this.client.get('/ping', function(err, req, res, result) {
            expect(result.ping).to.equal("pong");
            done();
        });
    });
});
