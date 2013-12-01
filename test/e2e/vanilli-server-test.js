/* jshint expr:true */
var vanilliLogLevel = "error",
    vanilli = require('../../lib/vanilli.js'),
    chai = require('chai'),
    expect = require('chai').expect,
    portfinder = require('portfinder');

require("better-stack-traces").install({
    before: 0,
    after: 0,
    collapseLibraries: true
});

portfinder.basePort = 14000;

chai.Assertion.includeStack = true;
chai.use(require('chai-http'));

describe('The Vanilli server', function () {
    var vanilliPort,
        dummyUrl = "/some/url",
        dummyStatus = 200,
        vanilliClient, vanilliServer;

    before(function (done) {
        portfinder.getPort(function (err, port) {
            if (err) {
                done(err);
            } else {
                vanilliPort = port;
                done();
            }
        });
    });

    beforeEach(function () {
        vanilliServer = vanilli.start({ port: vanilliPort, logLevel: vanilliLogLevel });
        vanilliClient = chai.request(vanilliServer.url);
    });

    afterEach(function () {
        vanilliServer.close();
    });

    it('MUST be pingable', function (done) {
        vanilliClient.get('/_vanilli/ping')
            .res(function (res) {
                expect(res).to.be.json;
                expect(res.status).to.equal(200);
                expect(res.body.ping).to.equal("pong");
                done();
            });
    });

    it('MUST include CORS headers in responses', function (done) {
        var stubUrl = "/my/url";

        vanilliClient.post('/_vanilli/stubs')
            .req(function (req) {
                req.send({
                    criteria: {
                        url: stubUrl
                    },
                    respondWith: {
                        status: dummyStatus
                    }
                });
            })
            .res(function (res) {
                expect(res.status).to.be.equal(200);
                expect(res.header['access-control-allow-origin']).to.equal("*");
                expect(res.header['access-control-allow-methods']).to.deep.equal("OPTIONS, DELETE, POST");
                expect(res.header['access-control-allow-headers']).to.exist;

                vanilliClient.options(stubUrl)
                    .res(function (res) {
                        expect(res.status).to.be.equal(200);
                        expect(res.header['access-control-allow-origin']).to.equal("*");
                        expect(res.header['access-control-allow-methods']).to.deep.equal("GET, DELETE, PUT, POST, OPTIONS");
                        expect(res.header['access-control-allow-headers']).to.exist;
                        done();
                    });
            });
    });

    it('MUST allow clearing down all stubs', function (done) {
        vanilliClient.post('/_vanilli/stubs')
            .req(function (req) {
                req.send({
                    criteria: {
                        url: dummyUrl
                    },
                    respondWith: {
                        status: dummyStatus
                    }
                });
            })
            .res(function (res) {
                expect(res.status).to.be.equal(200);

                vanilliClient.get(dummyUrl)
                    .res(function (res) {
                        expect(res.status).to.be.equal(dummyStatus);

                        vanilliClient.del('/_vanilli/stubs')
                            .res(function (res) {
                                console.log(res.body);
                                expect(res.status).to.be.equal(200);

                                vanilliClient.get(dummyUrl)
                                    .res(function (res) {
                                        expect(res.status).to.be.equal(404);
                                        done();
                                    });
                            });
                    });
            });
    });

    it('MUST allow adding of single stubs at a time', function (done) {
        var dummyStub = {
            criteria: {
                url: dummyUrl
            },
            respondWith: {
                status: dummyStatus
            }
        };

        vanilliClient.post('/_vanilli/stubs')
            .req(function (req) {
                req.send(dummyStub);
            })
            .res(function (res) {
                expect(res.status).to.be.equal(200);
                expect(res.body).to.have.length(1);
                done();
            });
    });

    it('MUST allow adding multiple stubs at a time', function (done) {
        var dummyStub = {
            criteria: {
                url: dummyUrl
            },
            respondWith: {
                status: dummyStatus
            }
        };

        vanilliClient.post('/_vanilli/stubs')
            .req(function (req) {
                req.send([ dummyStub, dummyStub ]);
            })
            .res(function (res) {
                expect(res.status).to.be.equal(200);
                expect(res.body).to.have.length(2);
                done();
            });
    });

    describe('stubs', function () {
        it('MUST have a url', function (done) {
            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.set('Content-Type', 'application/json');
                    req.send({
                        criteria: {
                        },
                        respondWith: {
                            status: dummyStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(400);
                    expect(res).to.be.json;
                    expect(res.body).to.match(/url/);
                    done();
                });
        });

        it('MUST have a contentType if a response body is specified', function (done) {
            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: 'my/url'
                        },
                        respondWith: {
                            status: 200,
                            body: {
                                something: "else"
                            }
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(400);
                    expect(res).to.be.json;
                    expect(res.body).to.match(/contentType/);
                    done();
                });
        });

        it('CAN have no response content type if there is no response body', function (done) {
            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: 'my/url'
                        },
                        respondWith: {
                            status: 200
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    done();
                });
        });

        it('MUST match against request with a matching url', function (done) {
            var expectedStatus = 234,
                url = "/my/url";

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: url
                        },
                        respondWith: {
                            status: expectedStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(url)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            done();
                        });
                });
        });

        it('MUST match against request with the same method', function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl,
                            method: 'DELETE'
                        },
                        respondWith: {
                            status: expectedStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.del(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            done();
                        });
                });
        });

        it("MUST match against request with headers that are included in the stub", function (done) {

            var expectedHeaderValue = "myvalue",
                expectedStatus = 234;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl,
                            headers: {
                                "My-Header": expectedHeaderValue
                            }
                        },
                        respondWith: {
                            status: expectedStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .req(function (req) {
                            req.set("My-Header", expectedHeaderValue);
                        })
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            done();
                        });
                });
        });

        it("MUST match against request with the same response body", function (done) {
            var expectedbody = {
                myfield: "myvalue"
            };

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl,
                            body: expectedbody,
                            contentType: 'application/json'
                        },
                        respondWith: {
                            status: dummyStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .req(function (req) {
                            req.set('Content-Type', 'application/json');
                            req.send(expectedbody);
                        })
                        .res(function (res) {
                            console.log(res.body);
                            expect(res.status).to.equal(dummyStatus);
                            done();
                        });
                });
        });

        it("MUST NOT match against request with no response body if the stub matches against body", function (done) {
            var expectedbody = {
                myfield: "myvalue"
            };

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl,
                            body: expectedbody,
                            contentType: 'application/json'
                        },
                        respondWith: {
                            status: dummyStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.equal(404);
                            done();
                        });
                });
        });

        it("MUST match any number times", function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: expectedStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);

                            vanilliClient.get(dummyUrl)
                                .res(function (res) {
                                    expect(res.status).to.be.equal(expectedStatus);
                                    done();
                                });
                        });
                });
        });

        it('MUST be matched against multiple identical requests in the order the stubs were added', function (done) {
            var dummyStub1 = {
                criteria: {
                    url: dummyUrl
                },
                respondWith: {
                    status: 1
                },
                times: 1
            }, dummyStub2 = {
                criteria: {
                    url: dummyUrl
                },
                respondWith: {
                    status: 2
                }
            };

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send([ dummyStub1, dummyStub2 ]);
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);

                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(1);

                            vanilliClient.get(dummyUrl)
                                .res(function (res) {
                                    expect(res.status).to.be.equal(2);
                                    done();
                                });
                        });
                });
        });
    });

    describe('expectations', function () {
        it("MUST match any number times", function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: expectedStatus
                        },
                        times: 1,
                        expect: true
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);

                            vanilliClient.get(dummyUrl)
                                .res(function (res) {
                                    expect(res.status).to.be.equal(expectedStatus);
                                    done();
                                });
                        });
                });
        });

        it("MUST be considered verified if they have been matched the expected number of times", function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: expectedStatus
                        },
                        times: 1,
                        expect: true
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);

                            vanilliClient.get('/_vanilli/stubs/verification')
                                .res(function (res) {
                                    expect(res.status).to.be.equal(200);
                                    expect(res.body.errors).to.be.empty;
                                    done();
                                });
                        });
                });
        });

        it("MUST NOT be considered verified if they have been not matched the expected number of times", function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: expectedStatus
                        },
                        times: 2,
                        expect: true
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);

                            vanilliClient.get('/_vanilli/stubs/verification')
                                .res(function (res) {
                                    expect(res.status).to.be.equal(200);
                                    expect(res.body.errors).to.have.length(1);
                                    done();
                                });
                        });
                });
        });
    });

    describe('requests', function () {
        it('MUST be honoured for GET request if it matches a stub', function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl,
                            method: 'GET'
                        },
                        respondWith: {
                            status: expectedStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            done();
                        });
                });
        });

        it('MUST be honoured for DELETE request if it matches a stub', function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl,
                            method: 'DELETE'
                        },
                        respondWith: {
                            status: expectedStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.del(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            done();
                        });
                });
        });

        it('MUST be honoured for POST request if it matches a stub', function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl,
                            method: 'POST'
                        },
                        respondWith: {
                            status: expectedStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.post(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            done();
                        });
                });
        });

        it('MUST be honoured for PUT request if it matches a stub', function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl,
                            method: 'PUT'
                        },
                        respondWith: {
                            status: expectedStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.put(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            done();
                        });
                });
        });

        it('MUST be honoured with a 404 if no stub matches', function (done) {
            vanilliClient.get(dummyUrl)
                .res(function (res) {
                    expect(res.status).to.be.equal(404);
                    expect(res).to.be.json;
                    expect(res.body.vanilli).to.be.equal('Stub not found.');
                    done();
                });
        });
    });

    describe('responses', function () {
        it('MUST have the status specified in the matching stub', function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: expectedStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            done();
                        });
                });
        });

        it('MUST have the body specified in the matching stub', function (done) {
            var expectedbody = {
                myfield: "mydata"
            };

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: dummyStatus,
                            body: expectedbody,
                            contentType: "application/json"
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res.body.myfield).to.be.equal('mydata');
                            done();
                        });
                });
        });

        it('MUST have the content type specified in the matching stub', function (done) {
            var expectedContentType = "text/plain";

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: dummyStatus,
                            body: "some data",
                            contentType: expectedContentType
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res).to.have.header('content-type', expectedContentType);
                            done();
                        });
                });
        });

        it('MUST have the headers specified in the matching stub', function (done) {
            var expectedHeaderValue = "myvalue";

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: dummyStatus,
                            headers: {
                                "My-Header": expectedHeaderValue
                            }
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res).to.have.header('my-header', expectedHeaderValue);
                            done();
                        });
                });
        });
    });
});
