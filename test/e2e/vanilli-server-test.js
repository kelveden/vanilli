/* jshint expr:true */
var vanilliLogLevel = "error",
    vanilli = require('../../lib/vanilli.js'),
    helper = require('./e2e-helper.js'),
    chai = require('chai'),
    expect = require('chai').expect;

chai.use(require('chai-http'));

describe('The Vanilli server', function () {
    var vanilliPort,
        dummyUrl = "/some/url",
        dummyStatus = 200,
        vanilliClient, vanilliServer;

    before(function (done) {
        helper.assignPorts(
            function (port) { vanilliPort = port; }
        )
        .then(done);
    });

    beforeEach(function () {
        vanilliServer = vanilli.startVanilli({ port: vanilliPort, logLevel: vanilliLogLevel });
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

        vanilliClient.post('/_vanilli/expect')
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
        vanilliClient.post('/_vanilli/expect')
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

                        vanilliClient.del('/_vanilli/expect')
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

    describe('stubs', function () {
        it('MUST have a url', function (done) {
            vanilliClient.post('/_vanilli/expect')
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

        it('MUST have a contentType if a response entity is specified', function (done) {
            vanilliClient.post('/_vanilli/expect')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: 'my/url'
                        },
                        respondWith: {
                            status: 200,
                                entity: {
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

        it('CAN have no response content type if there is no response entity', function (done) {
            vanilliClient.post('/_vanilli/expect')
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

            vanilliClient.post('/_vanilli/expect')
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

            vanilliClient.post('/_vanilli/expect')
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

            vanilliClient.post('/_vanilli/expect')
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

        it("MUST match against request with the same response entity", function (done) {
            var expectedEntity = {
                myfield: "myvalue"
            };

            vanilliClient.post('/_vanilli/expect')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl,
                            entity: expectedEntity,
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
                            req.send(expectedEntity);
                        })
                        .res(function (res) {
                            expect(res.status).to.equal(dummyStatus);
                            done();
                        });
                });
        });

        it("MUST NOT match against request with no response entity if the stub matches against entity", function (done) {
            var expectedEntity = {
                myfield: "myvalue"
            };

            vanilliClient.post('/_vanilli/expect')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl,
                            entity: expectedEntity,
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

        it("MUST ONLY match the number of times specified in the stub", function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/expect')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: expectedStatus
                        },
                        times: 1
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.get(dummyUrl)
                        .res(function (res) {
                            expect(res.status).to.be.equal(expectedStatus);

                            vanilliClient.get(dummyUrl)
                                .res(function (res) {
                                    expect(res.status).to.be.equal(404);
                                    done();
                                });
                        });
                });
        });

        it("MUST match any number times if not specified explicitly in the stub", function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/expect')
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
    });

    describe('requests', function () {
        it('MUST be honoured for GET request if it matches a stub', function (done) {
            var expectedStatus = 234;

            vanilliClient.post('/_vanilli/expect')
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

            vanilliClient.post('/_vanilli/expect')
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

            vanilliClient.post('/_vanilli/expect')
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

            vanilliClient.post('/_vanilli/expect')
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

            vanilliClient.post('/_vanilli/expect')
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

        it('MUST have the entity specified in the matching stub', function (done) {
            var expectedEntity = {
                myfield: "mydata"
            };

            vanilliClient.post('/_vanilli/expect')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: dummyStatus,
                                entity: expectedEntity,
                                contentType: "application/json"
                        }
                    });
                })
                .res(function (res) {
                    expect(res.status).to.be.equal(200);
                    vanilliClient.del(dummyUrl)
                        .res(function (res) {
                            expect(res.body.myfield).to.be.equal('mydata');
                            done();
                        });
                });
        });

        it('MUST have the content type specified in the matching stub', function (done) {
            var expectedContentType = "text/plain";

            vanilliClient.post('/_vanilli/expect')
                .req(function (req) {
                    req.send({
                        criteria: {
                            url: dummyUrl
                        },
                        respondWith: {
                            status: dummyStatus,
                                entity: "some data",
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

            vanilliClient.post('/_vanilli/expect')
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
