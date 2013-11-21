/* jshint expr:true */
var vanilliLogLevel = "error",
    vanilli = require('../../lib/vanilli.js'),
    chai = require('chai'),
    expect = chai.expect;

describe('Vanilli', function () {
    it('MUST throw an error if port is not explicitly specified', function () {
        expect(function () {
            vanilli.startVanilli({ logLevel: vanilliLogLevel });
        })
            .to.throw(/Port must be specified/);
    });
});
