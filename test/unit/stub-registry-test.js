/* jshint expr:true */
var vanilliLogLevel = "error",
    mocha = require('mocha'),
    expect = require('chai').expect,
    _ = require('lodash'),
    log = require('bunyan').createLogger({
        name: "vanilli-test",
        level: vanilliLogLevel
    });

describe('The stub registry', function () {
    var dummyStatus = 200,
        dummyUrl =/.+/,
        dummyCriteria = {
            url: dummyUrl
        },
        dummyRespondWith = {
            status: dummyStatus
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
            registry.add({
                criteria: dummyCriteria,
                respondWith: dummyRespondWith
            });
        });

        it('rejects a stub without criteria', function () {
            expect(function () {
                registry.add({
                    respondWith: dummyRespondWith
                });
            }).to.throw(/criteria/);
        });

        it('rejects a stub without a criteria url', function () {
            expect(function () {
                registry.add({
                    criteria: {
                    },
                    respondWith: dummyRespondWith
                });
            }).to.throw(/url/);
        });

        it('rejects a stub without respondWith', function () {
            expect(function () {
                registry.add({
                    criteria: dummyCriteria
                });
            }).to.throw(/respondWith/);
        });

        it('rejects a stub without a respondWith status', function () {
            expect(function () {
                registry.add({
                    criteria: dummyCriteria,
                    respondWith: {
                    }
                });
            }).to.throw(/status/);
        });

        it('rejects a stub with a respondWith entity but no content type', function () {
            expect(function () {
                registry.add({
                    criteria: dummyCriteria,
                    respondWith: {
                        status: dummyStatus,
                        entity: {}
                    }
                });
            }).to.throw(/contentType/);
        });

        it('rejects a stub with a criteria entity but no content type', function () {
            expect(function () {
                registry.add({
                    criteria: {
                        url: dummyUrl,
                        entity: { }
                    },
                    respondWith: dummyRespondWith
                });
            }).to.throw(/contentType/);
        });
    });

    describe('matcher', function () {
        var registry;

        beforeEach(function () {
            registry = require('../../lib/stub-registry.js').create(log);
        });

        it('returns null if no stub can be matched', function () {
            registry.add({
                criteria: {
                    url: "my/url"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "another/url" })).to.not.exist;
        });

        it('will match on stub specified with url string', function () {
            registry.add({
                criteria: {
                    url: "my/url"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url" })).to.exist;
        });

        it('will match on stub specified with url regex', function () {
            registry.add({
                criteria: {
                    url: /^my\/.+$/
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url" })).to.exist;
        });

        it('will not match on stub with different url', function () {
            registry.add({
                criteria: {
                    url: "some/url"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "another/url" })).to.not.exist;
        });

        it('will match on stub specified with HTTP method', function () {
            registry.add({
                criteria: {
                    url: dummyUrl,
                    method: "GET"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: "GET" })).to.exist;
        });

        it('will not match on stub specified with different HTTP method', function () {
            registry.add({
                criteria: {
                    url: dummyUrl,
                    method: "POST"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: "GET" })).to.not.exist;
        });

        it('will match on stub specified with HTTP method regardless of case', function () {
            registry.add({
                criteria: {
                    url: dummyUrl,
                    method: "GeT"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: "GET" })).to.exist;
        });

        it('will ONLY match if all stub criteria are met by the request', function () {
            registry.add({
                criteria: {
                    url: dummyUrl,
                    method: "GET"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", method: "POST" })).to.not.exist;
        });

        it('will match on stub specified with header text', function () {
            registry.add({
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
                headers: {
                    myheader: "myvalue" }
            })).to.exist;
        });

        it('will match on stub specified with header regex', function () {
            registry.add({
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
                headers: {
                    myheader: "myvalue" }
            })).to.exist;
        });

        it('will not match on stub specified with different header value', function () {
            registry.add({
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
                headers: {
                    myheader: "anothervalue" }
            })).to.not.exist;
        });

        it('will not match on stub specified with other header', function () {
            registry.add({
                criteria: {
                    url: dummyUrl,
                    headers: {
                        myheader: "myvalue"
                    }
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url", headers: {} })).to.not.exist;
        });

        it('will match on stub specified with entity content text', function () {
            registry.add({
                criteria: {
                    url: dummyUrl,
                    entity: {
                        myfield: "myvalue"
                    },
                    contentType: "application/json"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({
                url: "my/url",
                body: {
                    myfield: "myvalue"
                },
                contentType: "application/json"
            })).to.exist;
        });

        it('will match on stub specified with entity content regex', function () {
            registry.add({
                criteria: {
                    url: dummyUrl,
                    entity: /"myfield":"myvalue"/,
                    contentType: "application/json"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({
                url: "my/url",
                body: {
                    myfield: "myvalue"
                },
                contentType: "application/json"
            })).to.exist;
        });

        it('will match on stub specified with entity content matching function', function () {
            registry.add({
                criteria: {
                    url: dummyUrl,
                    entity: function (actualEntity) {
                        return actualEntity.myfield === "myvalue";
                    },
                    contentType: "application/json"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({
                url: "my/url",
                body: {
                    myfield: "myvalue"
                },
                headers: {
                    "Content-Type": "application/json"
                }
            })).to.exist;
        });

        it('will not match on stub specified with matching entity but different content type', function () {
            registry.add({
                criteria: {
                    url: dummyUrl,
                    entity: {
                        myfield: "myvalue"
                    },
                    contentType: "application/json"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({
                url: "my/url",
                body: {
                    myfield: "myvalue"
                },
                contentType: "text/plain"
            })).to.not.exist;
        });

        it('throws an error if more than one matching stub is found', function () {
            registry.add({
                criteria: {
                    url: dummyUrl
                },
                respondWith: dummyRespondWith
            });
            registry.add({
                criteria: {
                    url: dummyUrl
                },
                respondWith: dummyRespondWith
            });

            expect(function () {
                registry.findMatchFor({ url: "my/url" });
            }).to.throw(/more than one/i);
        });
    });
});

