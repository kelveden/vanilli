var expect = require('chai').expect,
    vanilli = require('../lib/vanilli.js'),
    restify = require('restify'),
    portScanner = require('./lib/port-scanner.js'),
    log = require('bunyan').createLogger({
        name: "vanilli-test",
        level: "error"
    });

describe('Vanilli', function () {
    var servers, vanilliPort, apiPort, vanilliClient, apiClient;

    function startServers(done) {
        portScanner.findFreePorts(2, function (ports) {
            apiPort = ports[0];
            vanilliPort = ports[1];

            servers = vanilli.startServer({ apiPort: apiPort, vanilliPort: vanilliPort, log: log });

            apiClient = restify.createJsonClient({
                url: 'http://localhost:' + apiPort
            });

            vanilliClient = restify.createJsonClient({
                url: 'http://localhost:' + vanilliPort
            });

            done();
        });
    }

    function stopServers() {
        servers.closeAll();
    }

    it('throws an error if no api port specified', function () {
        expect(function () { vanilli.startServer({ apiPort: 1234 }); }).to.throw(/vanilliPort not specified/);
    });

    it('throws an error if no vanilli port specified', function () {
        expect(function () { vanilli.startServer({ vanilliPort: 1234 }); }).to.throw(/apiPort not specified/);
    });

    describe('API', function () {
        before(function (done) {
            startServers(done);
        });

        after(function () {
            stopServers();
        });

        it('should be pingable', function (done) {
            apiClient.get('/ping', function (err, req, res, result) {
                expect(result.ping).to.equal("pong");
                done();
            });
        });
    });

    describe('Server', function () {
        before(function (done) {
            startServers(done);
        });

        after(function () {
            stopServers();
        });

        it('should be pingable', function (done) {
            vanilliClient.get('/ping', function (err, req, res, result) {
                expect(result.ping).to.equal("pong");
                done();
            });
        });
    });
});

