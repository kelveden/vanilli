/* jshint expr:true */
var vanilliLogLevel = "fatal",
    vanilli = require('../../lib/vanilli.js'),
    chai = require('chai'),
    expect = require('chai').expect,
    portfinder = require('portfinder'),
    allowedHeaderForCors = "My-Custom-Header";

require("better-stack-traces").install({
    before: 0,
    after: 0,
    collapseLibraries: true
});

portfinder.basePort = 14000;

chai.config.includeStack = true;
chai.use(require('chai-http'));

describe('The Vanilli server', function () {
    var vanilliPort,
        dummyUrl = "/some/url",
        dummyStatus = 200,
        vanilliClient, vanilliServer;

    function getAvailablePort(success, failure) {
        portfinder.getPort(function (err, port) {
            if (err) {
                failure(err);
            } else {
                success(port);
            }
        });
    }

    before(function (done) {
        getAvailablePort(function (port) {
            vanilliPort = port;
            done();
        }, done);
    });

    beforeEach(function () {
        vanilliServer = vanilli.start({
            port: vanilliPort,
            logLevel: vanilliLogLevel,
            allowedHeadersForCors: [ allowedHeaderForCors ],
            staticRoot: "test/e2e/static"
        });
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

    it('MUST include headers specified in configuration in CORS Access-Control-Allow-Headers header', function (done) {
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
                expect(res.header['access-control-allow-headers']).to.contain(allowedHeaderForCors);

                done();
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

    it('MUST serve up pre-defined static content if no stub is matched', function (done) {
        vanilliClient.get('/sub/something.html')
            .res(function (res) {
                expect(res.status).to.be.equal(200);
                done();
            });
    });

    it('MUST serve from stubs if static content not found', function (done) {
        getAvailablePort(function (port) {
            var vanilliServer = vanilli.start({
                    port: port,
                    logLevel: vanilliLogLevel,
                    allowedHeadersForCors: [ allowedHeaderForCors ],
                    staticRoot: "test/e2e/static"
                }),
                vanilliClient = chai.request(vanilliServer.url);

            vanilliClient.get('/sub/something.html')
                .res(function (res) {
                    vanilliServer.close();
                    expect(res.status).to.be.equal(200);
                    done();
                });
        }, done);
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

        it('CAN have no explicit method', function (done) {
            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.set('Content-Type', 'application/json');
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

        it("MUST match against request with the same request body", function (done) {
            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            method: "post",
                            url: dummyUrl,
                            body: { myfield: "some data" },
                            contentType: 'application/json'
                        },
                        respondWith: {
                            status: dummyStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.post(dummyUrl)
                        .req(function (req) {
                            req.set('Content-Type', 'application/json');
                            req.send({ "myfield": "some data" });
                        })
                        .res(function (res) {
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

        it("MUST match against request with the same query params", function (done) {
            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl,
                            query: {
                                param1: "value1"
                            }
                        },
                        respondWith: {
                            status: dummyStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl + "?param1=value1")
                        .res(function (res) {
                            expect(res.status).to.equal(dummyStatus);
                            done();
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
                            status: expectedStatus,
                            body: { some: "data" },
                            contentType: "application/json"
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            expect(res.body.some).to.be.equal("data");
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
                            status: expectedStatus,
                            body: { some: "data" },
                            contentType: "application/json"
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.post(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            expect(res.body.some).to.be.equal("data");
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
                            status: expectedStatus,
                            body: { some: "data" },
                            contentType: "application/json"
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.put(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            expect(res.body.some).to.be.equal("data");
                            done();
                        });
                });
        });

        it('MUST be honoured for request if it matches a stub which has no explicit method', function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: expectedStatus,
                            body: { some: "data" },
                            contentType: "application/json"
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.put(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            expect(res.body.some).to.be.equal("data");
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

        it('MUST be honoured by the first stub that matches the request', function (done) {
            var expectedStatus = 234,
                anotherStatus = 123;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send([
                        {
                            criteria: {
                                url: dummyUrl,
                                method: 'GET'
                            },
                            respondWith: {
                                status: expectedStatus
                            }
                        },
                        {
                            criteria: {
                                url: dummyUrl,
                                method: 'GET'
                            },
                            respondWith: {
                                status: anotherStatus
                            }
                        }
                    ]);
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

        it('MUST be honoured by the highest (i.e. lowest number) priority stub that matches the request', function (done) {
            var expectedStatus = 234,
                anotherStatus = 123;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send([
                        {
                            criteria: {
                                url: dummyUrl,
                                method: 'GET'
                            },
                            priority: 1,
                            respondWith: {
                                status: anotherStatus
                            }
                        },
                        {
                            criteria: {
                                url: dummyUrl,
                                method: 'GET'
                            },
                            priority: 0,
                            respondWith: {
                                status: expectedStatus
                            }
                        }
                    ]);
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

        it('MUST NOT be URL-decoded before matching against stubs', function (done) {
            var expectedStatus = 234,
                urlPath = "/some/url";

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: urlPath,
                            query: {
                                param1: encodeURIComponent("&abc&")
                            },
                            method: 'GET'
                        },
                        respondWith: {
                            status: expectedStatus
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(urlPath + "?param1=" + encodeURIComponent("&abc&"))
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);
                            done();
                        });
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

        it('MUST include subsitutions of placeholders in the body based on the values pulled from request querystring parameters', function (done) {
            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: dummyStatus,
                            body: {
                                myfield: "@vanilli:queryparam1@"
                            },
                            contentType: "application/json"
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl + "?queryparam1=value1")
                        .res(function (res) {
                            expect(res.body.myfield).to.equal("value1");
                            done();
                        });
                });
        });

        it('MUST include body wrapped in JSONP callback if specified', function (done) {
            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: dummyStatus,
                            body: "something",
                            contentType: "text/plain"
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl + "?callback=mycallback")
                        .req(function (req) {
                            req.buffer();
                        })
                        .res(function (res) {
                            expect(res.text).to.equal('mycallback("something");');
                            expect(res.header['content-type']).to.equal("application/javascript");
                            done();
                        });
                });
        });

        it('MUST include json body wrapped as object in JSONP callback if specified', function (done) {
            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: dummyStatus,
                            body: {
                                myfield1: 123,
                                myfield2: "abc"
                            },
                            contentType: "application/json"
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl + "?callback=mycallback")
                        .req(function (req) {
                            req.buffer();
                        })
                        .res(function (res) {
                            expect(res.text).to.equal('mycallback({"myfield1":123,"myfield2":"abc"});');
                            expect(res.header['content-type']).to.equal("application/javascript");
                            done();
                        });
                });
        });

        it('MUST use correct content type for response with content type not supported by a registered restify formatter', function (done) {
            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: dummyStatus,
                            body: "<html><body>some page</body></html>",
                            contentType: "text/html"
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .req(function (req) {
                            req.buffer();
                        })
                        .res(function (res) {
                            expect(res.text).to.equal('<html><body>some page</body></html>');
                            expect(res.header['content-type']).to.equal("text/html");
                            done();
                        });
                });
        });

        it("MUST only be closed after waiting the specified length of time", function (done) {
            var startResponse, endResponse;

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: dummyStatus,
                            wait: 1000
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    startResponse = (new Date()).getTime();
                    vanilliClient.get(dummyUrl)
                        .req(function (req) {
                            req.buffer();
                        })
                        .res(function () {
                            endResponse = (new Date()).getTime();
                            expect(endResponse - startResponse).to.be.greaterThan(1000);
                            done();
                        });
                });
        });
    });

    describe('captures', function () {
        it('MUST allow capturing of a POST request entity', function (done) {
            var body = { myfield: "mydata" },
                captureId = "mycapture";

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            method: 'POST',
                            url: "my/url"
                        },
                        respondWith: {
                            status: dummyStatus
                        },
                        capture: captureId
                    });
                })
                .res(function () {
                    vanilliClient.post('/my/url')
                        .req(function (req) {
                            req.send(body);
                        })
                        .res(function () {
                            vanilliClient.get('/_vanilli/captures/' + captureId)
                                .res(function (res) {
                                    expect(res.status).to.be.equal(200);
                                    expect(res.body.body.myfield).to.equal("mydata");
                                    expect(res.body.contentType).to.equal("application/json");

                                    done();
                                });
                        });
                });
        });

        it('MUST allow capturing of a POST request header', function (done) {
            var body = { some: "data" },
                captureId = "mycapture";

            vanilliClient.post('/_vanilli/stubs')
                .req(function (req) {
                    req.send({
                        criteria: {
                            method: 'POST',
                            url: "my/url"
                        },
                        respondWith: {
                            status: dummyStatus
                        },
                        capture: captureId
                    });
                })
                .res(function () {
                    vanilliClient.post('/my/url')
                        .req(function (req) {
                            req.set('My-Header', "myvalue");
                            req.send(body);
                        })
                        .res(function () {
                            vanilliClient.get('/_vanilli/captures/' + captureId)
                                .res(function (res) {
                                    expect(res.status).to.be.equal(200);
                                    expect(res.body.body.some).to.equal("data");

                                    expect(res.body.headers['my-header']).to.equal("myvalue");

                                    done();
                                });
                        });
                });
        });

        it('MUST return a 404 if a capture is not found', function (done) {
            vanilliClient.get('/_vanilli/captures/rubbish')
                .res(function (res) {
                    expect(res.status).to.be.equal(404);
                    done();
                });
        });
    });
});
