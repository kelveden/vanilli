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

            expect(registry.size).to.equal(1);
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

        it('rejects a stub with a respondWith body but no content type', function () {
            expect(function () {
                registry.add({
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
                registry.add({
                    criteria: {
                        url: dummyUrl,
                        body: { }
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

        it('will match on stub specified with url string with leading "/"', function () {
            registry.add({
                criteria: {
                    url: "/my/url"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url" })).to.exist;
        });

        it('will match on request with url with leading "/"', function () {
            registry.add({
                criteria: {
                    url: "/my/url"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "/my/url" })).to.exist;
        });

        it('will NOT match on stub with different url', function () {
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

        it('will NOT match on stub specified with different HTTP method', function () {
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

        it('will NOT match on stub specified with different header value', function () {
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

        it('will NOT match on stub specified with other header', function () {
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

        it('will match on stub specified with body content text', function () {
            registry.add({
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
                body: {
                    myfield: "myvalue"
                },
                contentType: function () {
                    return "application/json";
                }
            })).to.exist;
        });

        it('will match on stub specified with body content regex', function () {
            registry.add({
                criteria: {
                    url: dummyUrl,
                    body: /"myfield":"myvalue"/,
                    contentType: "application/json"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({
                url: "my/url",
                body: {
                    myfield: "myvalue"
                },
                contentType: function () {
                    return "application/json";
                }
            })).to.exist;
        });

        it('will match on stub specified with body content matching function', function () {
            registry.add({
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
                body: {
                    myfield: "myvalue"
                },
                headers: {
                    "Content-Type": "application/json"
                }
            })).to.exist;
        });

        it('will NOT match on stub specified with matching body but different content type', function () {
            registry.add({
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
                body: {
                    myfield: "myvalue"
                },
                contentType: function () {
                    return "text/plain";
                }
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

        it('will ONLY match the specified number of times', function () {
            registry.add({
                criteria: {
                    url: "my/url"
                },
                respondWith: dummyRespondWith,
                times: 1
            });

            expect(registry.findMatchFor({ url: "my/url" })).to.exist;
            expect(registry.findMatchFor({ url: "my/url" })).to.not.exist;
        });

        it('will match any number of times if not specified explicitly on the stub', function () {
            registry.add({
                criteria: {
                    url: "my/url"
                },
                respondWith: dummyRespondWith
            });

            expect(registry.findMatchFor({ url: "my/url" })).to.exist;
            expect(registry.findMatchFor({ url: "my/url" })).to.exist;
        });
    });


    describe('clearer', function () {
        var registry;

        beforeEach(function () {
            registry = require('../../lib/stub-registry.js').create(log);
        });

        it('can clear down all stubs at once', function () {
            // Given
            registry.add({
                criteria: dummyCriteria,
                respondWith: dummyRespondWith
            });
            registry.add({
                criteria: dummyCriteria,
                respondWith: dummyRespondWith
            });

            expect(registry.size).to.equal(2);

            // When
            registry.clear();

            // Then
            expect(registry.size).to.equal(0);
        });
    });
});

