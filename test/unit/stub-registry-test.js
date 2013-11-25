/* jshint expr:true */
var vanilliLogLevel = "error",
    expect = require('chai').expect,
    _ = require('lodash'),
    log = require('bunyan').createLogger({
        name: "vanilli-test",
        level: vanilliLogLevel
    });

describe('The stub registry', function () {
    var dummyStatus = 200,
        dummyUrl = /.+/,
        dummyCriteria = {
            url: dummyUrl,
            method: 'GET'
        },
        dummyRespondWith = {
            status: dummyStatus
        },
        dummyStub = {
            criteria: {
                url: dummyUrl
            },
            respondWith: dummyRespondWith
        };

    it('can be instantiated', function () {
        var registry = require('../../lib/stub-registry.js').create(log);

        expect(registry).to.exist;
    });

    describe('adder', function () {
        var registry;

        beforeEach(function () {
            registry = require('../../lib/stub-registry.js').create(log);
        });

        it('can be used to add a stub', function () {
            var stub = registry.addStub({
                criteria: dummyCriteria,
                respondWith: dummyRespondWith
            });

            expect(registry.getById(stub.id)).to.exist;
        });

        it('can be used to add an expectation', function () {
            var expectation = registry.addExpectation({
                criteria: dummyCriteria,
                respondWith: dummyRespondWith
            });

            expect(registry.getById(expectation.id)).to.exist;
            expect(expectation.expect).to.be.true;
        });

        it('rejects a stub with \'times\' specified', function () {
            expect(function () {
                registry.addStub({
                    criteria: dummyCriteria,
                    respondWith: dummyRespondWith,
                    times: 1
                });
            }).to.throw(/times/i);
        });

        it('sets the \'times\' of an expectation to 1 if not explicitly specified', function () {
            var expectation = registry.addExpectation({
                criteria: dummyCriteria,
                respondWith: dummyRespondWith
            });

            expect(registry.getById(expectation.id).times).to.equal(1);
        });

        it('sets the criteria method of to \'GET\' if not explicitly specified', function () {
            var expectation = registry.addExpectation({
                criteria: {
                    url: dummyUrl
                },
                respondWith: dummyRespondWith
            });

            expect(registry.getById(expectation.id).criteria.method).to.equal('GET');
        });

        it('keeps the \'times\' of an expectation as 0 if specified', function () {
            var expectation = registry.addExpectation({
                criteria: dummyCriteria,
                respondWith: dummyRespondWith,
                times: 0
            });

            expect(registry.getById(expectation.id).times).to.equal(0);
        });

        it('rejects a stub without criteria', function () {
            expect(function () {
                registry.addStub({
                    respondWith: dummyRespondWith
                });
            }).to.throw(/criteria/);
        });

        it('rejects a stub without a criteria url', function () {
            expect(function () {
                registry.addStub({
                    criteria: {
                    },
                    respondWith: dummyRespondWith
                });
            }).to.throw(/url/);
        });

        it('rejects a stub without respondWith', function () {
            expect(function () {
                registry.addStub({
                    criteria: dummyCriteria
                });
            }).to.throw(/respondWith/);
        });

        it('rejects a stub without a respondWith status', function () {
            expect(function () {
                registry.addStub({
                    criteria: dummyCriteria,
                    respondWith: {
                    }
                });
            }).to.throw(/status/);
        });

        it('rejects a stub with a respondWith body but no content type', function () {
            expect(function () {
                registry.addStub({
                    criteria: dummyCriteria,
                    respondWith: {
                        status: dummyStatus,
                        body: {}
                    }
                });
            }).to.throw(/contentType/);
        });

        it('rejects a stub with a criteria body but no content type', function () {
            expect(function () {
                registry.addStub({
                    criteria: {
                        url: dummyUrl,
                        body: { }
                    },
                    respondWith: dummyRespondWith
                });
            }).to.throw(/contentType/);
        });

        it('generates a unique id for the added stub', function () {
            var dummyStub = {
                    criteria: {
                        url: dummyUrl
                    },
                    respondWith: dummyRespondWith
                },
                id1 = registry.addStub(dummyStub).id,
                id2 = registry.addStub(dummyStub).id;

            expect(id1).to.exist;
            expect(id2).to.exist;
            expect(id1).to.not.equal(id2);
        });

        it('prefers the Content-Type header criteria over the contentType field', function () {
            var stub = registry.addStub({
                criteria: {
                    url: dummyUrl,
                    body: { some: "data" },
                    contentType: 'another/contenttype',
                    headers: {
                        'Content-Type': 'my/contenttype'
                    }
                },
                respondWith: dummyRespondWith
            });

            expect(stub.criteria.contentType).to.equal('my/contenttype');
        });

        it('prefers the Content-Type response header over the contentType field', function () {
            var stub = registry.addStub({
                criteria: {
                    url: dummyUrl
                },
                respondWith: {
                    status: dummyStatus,
                    body: { some: "data" },
                    contentType: 'another/contenttype',
                    headers: {
                        'Content-Type': 'my/contenttype'
                    }
                }
            });

            expect(stub.respondWith.contentType).to.equal('my/contenttype');
        });
    });

    describe('getter', function () {
        var registry;

        beforeEach(function () {
            registry = require('../../lib/stub-registry.js').create(log);
        });

        it('can be used to get a stub by id', function () {
            var stub = registry.addStub(dummyStub);

            expect(registry.getById(stub.id).id).to.equal(stub.id);
        });

        it('will return null if no stub is found with the id', function () {
            registry.addStub(dummyStub);

            expect(registry.getById("rubbish")).to.not.exist;
        });
    });

    describe('matcher', function () {
        var registry;

        beforeEach(function () {
            registry = require('../../lib/stub-registry.js').create(log);
        });

        it('returns null if no stub can be matched', function () {
            registry.addStub({
                criteria: {
                    url: "my/url"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "another/url", method: 'GET' })).to.not.exist;
        });

        it('will match on stub specified with url string', function () {
            registry.addStub({
                criteria: {
                    url: "my/url"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: 'GET' })).to.exist;
        });

        it('will match on stub specified with url regex', function () {
            registry.addStub({
                criteria: {
                    url: /^my\/.+$/
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: 'GET' })).to.exist;
        });

        it('will match on stub specified with url string with leading "/"', function () {
            registry.addStub({
                criteria: {
                    url: "/my/url"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: 'GET' })).to.exist;
        });

        it('will match on request with url with leading "/"', function () {
            registry.addStub({
                criteria: {
                    url: "/my/url"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "/my/url", method: 'GET' })).to.exist;
        });

        it('will NOT match on stub with different url', function () {
            registry.addStub({
                criteria: {
                    url: "some/url"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "another/url", method: 'GET' })).to.not.exist;
        });

        it('will match on stub specified with HTTP method', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    method: "GET"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: "GET" })).to.exist;
        });

        it('will NOT match on stub specified with different HTTP method', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    method: "POST"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: "GET" })).to.not.exist;
        });

        it('will match on stub specified with HTTP method regardless of case', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    method: "GeT"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: "GET" })).to.exist;
        });

        it('will ONLY match if all stub criteria are met by the request', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    method: "GET"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: "POST" })).to.not.exist;
        });

        it('will match on stub specified with header text', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    headers: {
                        myheader: "myvalue"
                    }
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({
                url: "my/url",
                method: 'GET',
                headers: {
                    myheader: "myvalue" }
            })).to.exist;
        });

        it('will match on stub specified with header regex', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    headers: {
                        myheader: /^myval.+$/
                    }
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({
                url: "my/url",
                method: 'GET',
                headers: {
                    myheader: "myvalue" }
            })).to.exist;
        });

        it('will NOT match on stub specified with different header value', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    headers: {
                        myheader: "myvalue"
                    }
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({
                url: "my/url",
                method: 'GET',
                headers: {
                    myheader: "anothervalue" }
            })).to.not.exist;
        });

        it('will NOT match on stub specified with other header', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    headers: {
                        myheader: "myvalue"
                    }
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: 'GET', headers: {} })).to.not.exist;
        });

        it('will match on stub specified with body content text', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    body: {
                        myfield: "myvalue"
                    },
                    contentType: "application/json"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({
                url: "my/url",
                method: 'GET',
                body: {
                    myfield: "myvalue"
                },
                contentType: function () {
                    return "application/json";
                }
            })).to.exist;
        });

        it('will match on stub specified with body content regex', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    body: /"myfield":"myvalue"/,
                    contentType: "application/json"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({
                url: "my/url",
                method: 'GET',
                body: {
                    myfield: "myvalue"
                },
                contentType: function () {
                    return "application/json";
                }
            })).to.exist;
        });

        it('will match on stub specified with body content matching function', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    body: function (actualbody) {
                        return actualbody.myfield === "myvalue";
                    },
                    contentType: "application/json"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({
                url: "my/url",
                method: 'GET',
                body: {
                    myfield: "myvalue"
                },
                headers: {
                    "Content-Type": "application/json"
                }
            })).to.exist;
        });

        it('will NOT match on stub specified with matching body but different content type', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    body: {
                        myfield: "myvalue"
                    },
                    contentType: "application/json"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({
                url: "my/url",
                method: 'GET',
                body: {
                    myfield: "myvalue"
                },
                contentType: function () {
                    return "text/plain";
                }
            })).to.not.exist;
        });

        it('throws an error if more than one matching stub is found', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    method: 'GET'
                },
                respondWith: dummyRespondWith
            });
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    method: 'GET'
                },
                respondWith: dummyRespondWith
            });

            expect(function () {
                registry.findMatchFor({ url: "my/url", method: 'GET' });
            }).to.throw(/more than one/i);
        });

        it('will match a stub any number of times', function () {
            registry.addStub({
                criteria: {
                    url: "my/url",
                    method: 'GET'
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: 'GET' })).to.exist;
            expect(registry.findMatchFor({ url: "my/url", method: 'GET' })).to.exist;
        });

        it('will match an expectation any number of times', function () {
            registry.addExpectation({
                criteria: {
                    url: "my/url",
                    method: 'GET'
                },
                respondWith: dummyRespondWith,
                times: 1
            });

            expect(registry.findMatchFor({ url: "my/url", method: 'GET' })).to.exist;
            expect(registry.findMatchFor({ url: "my/url", method: 'GET' })).to.exist;
        });
    });

    describe('verifier', function () {
        var registry;

        beforeEach(function () {
            registry = require('../../lib/stub-registry.js').create(log);
        });

        it('returns a list of errors if an expectation has not been matched against', function () {
            registry.addExpectation({
                criteria: {
                    url: "my/url"
                },
                respondWith: dummyRespondWith
            });
            registry.addExpectation({
                criteria: {
                    url: "another/url"
                },
                respondWith: dummyRespondWith,
                times: 2
            });

            var verificationResult = registry.verifyExpectations();

            expect(verificationResult).to.have.length(2);
            expect(verificationResult[0]).to.match(/Expected: 1; Actual: 0/);
            expect(verificationResult[1]).to.match(/Expected: 2; Actual: 0/);
        });

        it('does not returns errors if an expectation has been met', function () {
            registry.addExpectation({
                criteria: {
                    url: "my/url",
                    method: 'GET'
                },
                respondWith: dummyRespondWith
            });

            registry.findMatchFor({ url: "my/url", method: 'GET' });

            expect(registry.verifyExpectations()).to.be.empty;
        });

        it('returns an error if an expectation has been matched against a different number of times to that expected', function () {
            registry.addExpectation({
                criteria: {
                    url: "my/url",
                    method: 'GET'
                },
                respondWith: dummyRespondWith,
                times: 3
            });

            registry.findMatchFor({ url: "my/url", method: 'GET' });
            registry.findMatchFor({ url: "my/url", method: 'GET' });

            expect(registry.verifyExpectations()[0]).to.match(/Expected: 3; Actual: 2/);
        });

        it('returns an error if an expectation with zero times has been matched against', function () {
            registry.addExpectation({
                criteria: {
                    url: "my/url",
                    method: 'GET'
                },
                respondWith: dummyRespondWith,
                times: 0
            });

            registry.findMatchFor({ url: "my/url", method: 'GET' });

            expect(registry.verifyExpectations()[0]).to.match(/Expected: 0; Actual: 1/);
        });
    });

    describe('clearer', function () {
        var registry;

        beforeEach(function () {
            registry = require('../../lib/stub-registry.js').create(log);
        });

        it('can clear down all stubs at once', function () {
            // Given
            var stub = registry.addStub({
                    criteria: dummyCriteria,
                    respondWith: dummyRespondWith
                });

            expect(registry.getById(stub.id)).to.exist;

            // When
            registry.clear();

            // Then
            expect(registry.getById(stub.id)).to.not.exist;
        });
    });
});

