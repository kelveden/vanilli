var expect = require('expect.js'),
    vanilli = require('../vanilli.js'),
    restify = require('restify'),
    log = require('bunyan').createLogger({ name: "vanilli-test" }),
    portScanner = require('./lib/port-scanner.js');

describe('Vanilli', function () {
    var servers, vanilliPort, apiPort, vanilliClient, apiClient;

    before(function (done) {
        portScanner.findFreePorts(2, function (ports) {
            apiPort = ports[0];
            vanilliPort = ports[1];

            servers = vanilli.startServer({ apiPort: apiPort, serverPort: vanilliPort });

            apiClient = restify.createJsonClient({
                url: 'http://localhost:' + apiPort
            });

            vanilliClient = restify.createJsonClient({
                url: 'http://localhost:' + vanilliPort
            });

            done();
        });
    });

    after(function () {
        servers.closeAll();
    });

    describe('API', function () {
        it('should be pingable', function (done) {
            apiClient.get('/ping', function (err, req, res, result) {
                expect(result.ping).to.equal("pong");
                done();
            });
        });
    });

    describe('Vanilli Server', function () {
        it('should be pingable', function (done) {
            vanilliClient.get('/ping', function (err, req, res, result) {
                expect(result.ping).to.equal("pong");
                done();
            });
        });
    });
});

