var vanilliLogLevel = "error",
    expect = require('chai').expect,
    chai = require('chai'),
    log = require('bunyan').createLogger({
        name: "vanilli-test",
        level: vanilliLogLevel
    });

describe('The stub registry', function () {
    it('can be instantiated', function () {
        var registry = require('../../lib/stub-registry.js').create(log);

        expect(registry).to.be.defined;
    });
});

