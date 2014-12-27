/* jshint expr:true */
var expect = require('chai').expect;

describe('Placeholder manager', function () {

    it("can be instantiated", function () {

        var placeholderManager = require('../../lib/vanilli/placeholder-manager.js');

        expect(placeholderManager).to.exist;
    });

    describe("substitutor", function () {

        var placeholderManager;

        beforeEach(function () {
            placeholderManager = require('../../lib/vanilli/placeholder-manager.js');
        });

        it("will substitute one placeholder", function () {

            var request = {
                    query: {
                        myparam1: "myvalue"
                    }
                },
                response = "__@vanilli:myparam1@__",
                result = placeholderManager.substitute(request, response);

            expect(result).to.equal("__myvalue__");
        });

        it("will substitute multiple placeholders", function () {

            var request = {
                    query: {
                        myparam1: "myvalue1",
                        myparam2: "myvalue2"
                    }
                },
                response = "__@vanilli:myparam1@__@vanilli:myparam2@__",
                result = placeholderManager.substitute(request, response);

            expect(result).to.equal("__myvalue1__myvalue2__");
        });

        it("will substitute a placeholder multiple times", function () {

            var request = {
                    query: {
                        myparam1: "myvalue1"
                    }
                },
                response = "__@vanilli:myparam1@__@vanilli:myparam1@__",
                result = placeholderManager.substitute(request, response);

            expect(result).to.equal("__myvalue1__myvalue1__");
        });

        it("will substitute a placeholder in a JSON response", function () {

            var request = {
                    query: {
                        myparam1: "myvalue"
                    }
                },
                response = {
                    myfield: "@vanilli:myparam1@"
                },
                result = placeholderManager.substitute(request, response);

            expect(result.myfield).to.equal("myvalue");
        });

        it("will simply echo back the response body if it is not specified", function () {

            var result = placeholderManager.substitute({}, null);

            expect(result).to.be.null;
        });
    });
});
