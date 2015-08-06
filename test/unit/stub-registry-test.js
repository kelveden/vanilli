/* jshint expr:true */
var vanilliLogLevel = "fatal",
    expect = require('chai').expect,
    _ = require('lodash'),
    config = {
        log: require('bunyan').createLogger({
            name: "vanilli-test",
            level: vanilliLogLevel
        })
    };

describe('The stub registry', function () {
    var dummyStatus = 200,
        dummyUrl = { regex: ".+" },
        dummyPath = "/some/url",
        dummyCriteria = {
            url: dummyUrl,
            method: 'GET'
        },
        dummyResponse = {
            status: dummyStatus
        },
        dummyStub = {
            criteria: {
                url: dummyUrl
            },
            response: dummyResponse
        };

    function path(url) {
        return function () {
            return url;
        };
    }

    it('can be instantiated', function () {
        var registry = require('../../lib/vanilli/stub-registry.js').create(config);

        expect(registry).to.exist;
    });

    describe('adder', function () {
        var registry;

        beforeEach(function () {
            registry = require('../../lib/vanilli/stub-registry.js').create(config);
        });

        it('can be used to add a stub', function () {
            var stub = registry.addStub({
                criteria: dummyCriteria,
                response: dummyResponse
            });

            expect(registry.getById(stub.id)).to.exist;
        });

        it('can be used to add an expectation', function () {
            var expectation = registry.addStub({
                criteria: dummyCriteria,
                response: dummyResponse,
                times: 1,
                expect: true
            });

            expect(registry.getById(expectation.id)).to.exist;
            expect(expectation.expect).to.be.true;
        });

        it('keeps the \'times\' of an expectation as 0 if specified', function () {
            var expectation = registry.addStub({
                criteria: dummyCriteria,
                response: dummyResponse,
                times: 0
            });

            expect(registry.getById(expectation.id).times).to.equal(0);
        });

        it('rejects a stub without criteria', function () {
            expect(function () {
                registry.addStub({
                    response: dummyResponse
                });
            }).to.throw(/criteria/);
        });

        it('rejects a stub without a criteria url', function () {
            expect(function () {
                registry.addStub({
                    criteria: {
                    },
                    response: dummyResponse
                });
            }).to.throw(/url/);
        });

        it('rejects a stub without response', function () {
            expect(function () {
                registry.addStub({
                    criteria: dummyCriteria
                });
            }).to.throw(/response/);
        });

        it('rejects a stub without a response status', function () {
            expect(function () {
                registry.addStub({
                    criteria: dummyCriteria,
                    response: {
                    }
                });
            }).to.throw(/status/);
        });

        it('rejects a stub with a response body but no content type', function () {
            expect(function () {
                registry.addStub({
                    criteria: dummyCriteria,
                    response: {
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
                    response: dummyResponse
                });
            }).to.throw(/contentType/);
        });

        it('generates a unique id for the added stub', function () {
            var dummyStub = {
                    criteria: {
                        url: dummyUrl
                    },
                    response: dummyResponse
                },
                id1 = registry.addStub(dummyStub).id,
                id2 = registry.addStub(dummyStub).id;

            expect(id1).to.exist;
            expect(id2).to.exist;
            expect(id1).to.not.equal(id2);
        });
    });

    describe('getter', function () {
        var registry;

        beforeEach(function () {
            registry = require('../../lib/vanilli/stub-registry.js').create(config);
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
            registry = require('../../lib/vanilli/stub-registry.js').create(config);
        });

        it('returns null if no stub can be matched', function () {
            registry.addStub({
                criteria: {
                    url: "my/url"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("another/url"), method: 'GET' })).to.not.exist;
        });

        it('will match on stub specified with url string', function () {
            registry.addStub({
                criteria: {
                    url: "my/url"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("/my/url"), method: 'GET' })).to.exist;
        });

        it('will match on stub specified with url regex', function () {
            registry.addStub({
                criteria: {
                    url: {
                        regex: "/my/.+$"
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("my/url"), method: 'GET' })).to.exist;
        });

        it('will not match on stub specified with url string that happens to be a matching regex', function () {
            registry.addStub({
                criteria: {
                    url: "/my/.+$"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("my/url"), method: 'GET' })).to.not.exist;
        });

        it('will match on stub specified with url string with leading "/"', function () {
            registry.addStub({
                criteria: {
                    url: "/my/url"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("my/url"), method: 'GET' })).to.exist;
        });

        it('will match on request with url with leading "/"', function () {
            registry.addStub({
                criteria: {
                    url: "/my/url"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("/my/url"), method: 'GET' })).to.exist;
        });

        it('will NOT match on stub with different url', function () {
            registry.addStub({
                criteria: {
                    url: "some/url"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("some/url/or/other"), method: 'GET' })).to.not.exist;
        });

        it('will match on stub specified with HTTP method', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    method: "GET"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("my/url"), method: "GET" })).to.exist;
        });

        it('will NOT match on stub specified with different HTTP method', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    method: "POST"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("my/url"), method: "GET" })).to.not.exist;
        });

        it('will match on stub specified with HTTP method regardless of case', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    method: "GeT"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("my/url"), method: "GET" })).to.exist;
        });

        it('will ONLY match if all stub criteria are met by the request', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    method: "GET"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("my/url"), method: "POST" })).to.not.exist;
        });

        it('will match on stub specified with header text', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    headers: {
                        myheader: "myvalue"
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                path: path("my/url"),
                method: 'GET',
                headers: {
                    myheader: "myvalue" }
            })).to.exist;
        });

        it('will match on stub specified with header matching regex', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    headers: {
                        myheader: {
                            regex: "my.+alue"
                        }
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                path: path("my/url"),
                method: 'GET',
                headers: {
                    myheader: "myvalue"
                }
            })).to.exist;
        });

        it('will not match on stub specified with header string that happens to be matching regex', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    headers: {
                        myheader: "my.+alue"
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                path: path("my/url"),
                method: 'GET',
                headers: {
                    myheader: "myvalue"
                }
            })).to.not.exist;
        });

        it('will NOT match on stub specified with different header value', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    headers: {
                        myheader: "0"
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                path: path("my/url"),
                method: 'GET',
                headers: {
                    myheader: "10"
                }
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
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("my/url"), method: 'GET', headers: {} })).to.not.exist;
        });

        it('will only match on stub specified with multiple headers when request has all headers', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    headers: {
                        myheader1: "myvalue1",
                        myheader2: "myvalue2"
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                path: path("my/url"), method: 'GET', headers: {
                    myheader1: "myvalue1"
                }
            })).to.not.exist;
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
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                path: path("my/url"),
                method: 'GET',
                body: {
                    myfield: "myvalue"
                },
                contentType: function () {
                    return "application/json";
                }
            })).to.exist;
        });

        it('will match on stub with bodies despite extra fields', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    body: {
                        my: { field: "value" }
                    },
                    contentType: "application/json"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                path: path("my/url"),
                method: 'GET',
                body: {
                    my: { field: "value" },
                    another: { field: "another" }
                },
                contentType: function () {
                    return "application/json";
                }
            })).to.exist;
        });

        it('will NOT match on stub with bodies if not all fields present', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    body: {
                        my: { field: "value" },
                        another: { field: "another" }
                    },
                    contentType: "application/json"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                path: path("my/url"),
                method: 'GET',
                body: {
                    my: { field: "value" }
                },
                contentType: function () {
                    return "application/json";
                }
            })).to.not.exist;
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
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                path: path("my/url"),
                method: 'GET',
                body: JSON.stringify({
                    myfield: "myvalue"
                }),
                contentType: function () {
                    return "text/plain";
                }
            })).to.not.exist;
        });

        it('will match a stub any number of times', function () {
            registry.addStub({
                criteria: {
                    url: "my/url",
                    method: 'GET'
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("my/url"), method: 'GET' })).to.exist;
            expect(registry.findMatchFor({ path: path("my/url"), method: 'GET' })).to.exist;
        });

        it('will match an expectation any number of times', function () {
            registry.addStub({
                criteria: {
                    url: "my/url",
                    method: 'GET'
                },
                response: dummyResponse,
                times: 1,
                expect: true
            });

            expect(registry.findMatchFor({ path: path("my/url"), method: 'GET' })).to.exist;
            expect(registry.findMatchFor({ path: path("my/url"), method: 'GET' })).to.exist;
        });

        it('will match on stub specified with query param value', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    query: {
                        param1: "value1"
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                    path: path(dummyPath),
                    method: 'GET',
                    query: { param1: "value1", param2: "value2" }
                }
            )).to.exist;
        });

        it('will match on stub specified with query param value matching regex', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    query: {
                        param1: {
                            regex: "va.+ue1"
                        }
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                    path: path(dummyPath),
                    method: 'GET',
                    query: {
                        param1: "value1",
                        param2: "value2"
                    }
                }
            )).to.exist;
        });

        it('will not match on stub specified with query param value string that happens to be matching regex', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    query: {
                        param1: "va.+ue1"
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                    path: path(dummyPath),
                    method: 'GET',
                    query: {
                        param1: "value1",
                        param2: "value2"
                    }
                }
            )).to.not.exist;
        });

        it('will NOT match on stub specified with different query param value', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    query: {
                        param1: "0"
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                    path: path(dummyPath),
                    method: 'GET',
                    query: {
                        param1: "10"
                    }
                }
            )).to.not.exist;
        });

        it('will NOT match on stub specified with other query param', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    query: {
                        param1: "value1"
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                    path: path(dummyPath),
                    method: 'GET',
                    query: { param2: "value1" }
                }
            )).to.not.exist;
        });

        it('will only match on stub specified with multiple query params when request has all query params', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    query: {
                        param1: "myvalue1",
                        param2: "myvalue2"
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                path: path(dummyPath), method: 'GET', query: function () {
                    return "param1=myvalue1";
                }
            })).to.not.exist;
        });

        it('will match on stub specified with repeated query params when request has all query params', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    query: {
                        param1: [ "myvalue1", "myvalue2" ],
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                path: path(dummyPath), method: 'GET', query: { param1: [ "myvalue2", "myvalue1" ]}
            })).to.exist;
        });

        it('will match on stub specified with repeated query params when request does not have all values', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl,
                    query: {
                        param1: [ "myvalue1", "myvalue2" ],
                    }
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({
                path: path(dummyPath), method: 'GET', query: { param1: [ "myvalue2" ]}
            })).to.not.exist;
        });

        it('returns null if no stub can be matched', function () {
            registry.addStub({
                criteria: {
                    url: "my/url"
                },
                response: dummyResponse
            });

            expect(registry.findMatchFor({ path: path("another/url"), method: 'GET' })).to.not.exist;
        });

        it('matches the last matching stub', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl
                },
                response: {
                    status: 123
                }
            });
            registry.addStub({
                criteria: {
                    url: dummyUrl
                },
                response: {
                    status: 456
                }
            });

            expect(registry.findMatchFor({ path: path(dummyPath), method: 'GET' }).response.status).to.equal(456);
        });

        it('matches the highest priority (i.e. lowest number) matching stub', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl
                },
                priority: 1,
                response: {
                    status: 123
                }
            });
            registry.addStub({
                criteria: {
                    url: dummyUrl
                },
                priority: 0,
                response: {
                    status: 456
                }
            });

            expect(registry.findMatchFor({ path: path(dummyPath), method: 'GET' }).response.status).to.equal(456);
        });

        it('matches the last matching stub when priorities match', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl
                },
                priority: 1,
                response: {
                    status: 123
                }
            });
            registry.addStub({
                criteria: {
                    url: dummyUrl
                },
                priority: 1,
                response: {
                    status: 456
                }
            });

            expect(registry.findMatchFor({ path: path(dummyPath), method: 'GET' }).response.status).to.equal(456);
        });

        it('assumes a priority of 0 for stubs without an explicit priority', function () {
            registry.addStub({
                criteria: {
                    url: dummyUrl
                },
                priority: 1,
                response: {
                    status: 123
                }
            });
            registry.addStub({
                criteria: {
                    url: dummyUrl
                },
                response: {
                    status: 456
                }
            });

            expect(registry.findMatchFor({ path: path(dummyPath), method: 'GET' }).response.status).to.equal(456);
        });
    });

    describe('verifier', function () {
        var registry;

        beforeEach(function () {
            registry = require('../../lib/vanilli/stub-registry.js').create(config);
        });

        it('returns a list of errors if an expectation has not been matched against', function () {
            registry.addStub({
                criteria: {
                    url: "my/url"
                },
                response: dummyResponse,
                times: 1,
                expect: true
            });
            registry.addStub({
                criteria: {
                    url: "another/url"
                },
                response: dummyResponse,
                times: 2,
                expect: true
            });

            var verificationResult = registry.verifyExpectations();

            expect(verificationResult).to.have.length(2);
            expect(verificationResult[0]).to.match(/Expected: 1; Actual: 0/);
            expect(verificationResult[1]).to.match(/Expected: 2; Actual: 0/);
        });

        it('does not return errors if an expectation has been met', function () {
            registry.addStub({
                criteria: {
                    url: "my/url",
                    method: 'GET',
                    times: 1
                },
                response: dummyResponse
            });

            registry.findMatchFor({ path: path("my/url"), method: 'GET' });

            expect(registry.verifyExpectations()).to.be.empty;
        });

        it('does not return errors if no stub is an expectation', function () {
            registry.addStub({
                criteria: {
                    url: "my/url",
                    method: 'GET'
                },
                response: dummyResponse
            });

            registry.findMatchFor({ path: path("my/url"), method: 'GET' });

            expect(registry.verifyExpectations()).to.be.empty;
        });

        it('returns an error if an expectation has been matched against a different number of times to that expected', function () {
            registry.addStub({
                criteria: {
                    url: "my/url",
                    method: 'GET'
                },
                response: dummyResponse,
                times: 3,
                expect: true
            });

            registry.findMatchFor({ path: path("my/url"), method: 'GET' });
            registry.findMatchFor({ path: path("my/url"), method: 'GET' });

            expect(registry.verifyExpectations()[0]).to.match(/Expected: 3; Actual: 2/);
        });

        it('returns an error if an expectation with zero times has been matched against', function () {
            registry.addStub({
                criteria: {
                    url: "my/url",
                    method: 'GET'
                },
                response: dummyResponse,
                times: 0,
                expect: true
            });

            registry.findMatchFor({ path: path("my/url"), method: 'GET' });

            expect(registry.verifyExpectations()[0]).to.match(/Expected: 0; Actual: 1/);
        });
    });

    describe('clearer', function () {
        var registry;

        beforeEach(function () {
            registry = require('../../lib/vanilli/stub-registry.js').create(config);
        });

        it('can clear down all stubs at once', function () {
            // Given
            var stub = registry.addStub({
                criteria: dummyCriteria,
                response: dummyResponse
            });

            expect(registry.getById(stub.id)).to.exist;

            // When
            registry.clear();

            // Then
            expect(registry.getById(stub.id)).to.not.exist;
        });
    });

    describe('capturer', function () {
        var registry;

        beforeEach(function () {
            registry = require('../../lib/vanilli/stub-registry.js').create(config);
        });

        it('can capture a request', function () {
            // Given
            var body = {
                    some: "data"
                },
                contentType = "my/contenttype",
                stub = registry.addStub({
                    criteria: {
                        method: 'POST',
                        url: "/my/url"
                    },
                    response: dummyResponse,
                    captureId: "mycapture"
                });

            // When
            expect(registry.findMatchFor({
                path: path("my/url"),
                method: 'POST',
                body: body,
                contentType: function () {
                    return contentType;
                }
            })).to.exist;

            // Then
            expect(registry.getCapture('mycapture').body).to.deep.equal(body);
            expect(registry.getCapture('mycapture').contentType).to.equal(contentType);
        });

        it('can capture multiple requests', function () {
            var contentType = "my/contenttype";

            registry.addStub({
                criteria: {
                    method: 'POST',
                    url: "/my/url"
                },
                response: dummyResponse,
                captureId: "mycapture"
            });

            registry.findMatchFor({
                path: path("my/url"),
                method: 'POST',
                body: { some: 'body' },
                contentType: function () {
                    return contentType;
                }
            });

            registry.findMatchFor({
                path: path("my/url"),
                method: 'POST',
                body: { other: 'body' },
                contentType: function () {
                    return contentType;
                }
            });

            expect(registry.getCaptures('mycapture')).to.have.length(2);
            expect(registry.getCaptures('mycapture')[0].body).to.deep.equal({ some: 'body' });
            expect(registry.getCaptures('mycapture')[1].body).to.deep.equal({ other: 'body' });
        });
    });
});

