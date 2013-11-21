/* jshint expr:true */
var vanilliLogLevel = "error",
    vanilli = require('../../lib/vanilli.js'),
    helper = require('./e2e-helper.js'),
    chai = require('chai'),
    expect = chai.expect;

chai.use(require('chai-http'));

describe('The Vanilli API server', function () {
    var apiPort, fakePort, apiClient, vanilliEnvironment;

    before(function (done) {
        helper.assignPorts(
            function (port) {
                apiPort = port;
            }, function (port) {
                fakePort = port;
            })
            .then(done);
    });

    beforeEach(function () {
        vanilliEnvironment = vanilli.startVanilli({ apiPort: apiPort, fakePort: fakePort, logLevel: vanilliLogLevel });
        apiClient = chai.request(vanilliEnvironment.apiServer.url);
    });

    afterEach(function () {
        vanilliEnvironment.stop();
    });

    it('MUST be pingable', function (done) {
        apiClient.get('/ping')
            .res(function (res) {
                expect(res).to.be.json;
                expect(res.status).to.equal(200);
                expect(res.body.ping).to.equal("pong");
                done();
            });
    });

    it('MUST include CORS headers in responses', function (done) {
        apiClient.options('/expect')
            .res(function (res) {
                expect(res.status).to.be.equal(200);
                expect(res.header['access-control-allow-origin']).to.equal("*");
                expect(res.header['access-control-allow-methods']).to.deep.equal("OPTIONS, DELETE, POST");
                expect(res.header['access-control-allow-headers']).to.exist;
                done();
            });
    });
});
