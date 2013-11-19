var vanilliLogLevel = "error",
    vanilli = require('../../lib/vanilli.js'),
    helper = require('./e2e-helper.js'),
    expect = require('chai').expect,
    chai = require('chai'),
    request = require('supertest');

describe('The Vanilli fake server', function () {
    var apiPort, fakePort,
        dummyUrl = "/some/url",
        dummyStatus = 200;

    before(function (done) {
        helper.assignPorts(
            function (port) {
                apiPort = port;
            }, function (port) {
                fakePort = port;
            })
            .then(done);
    });

    describe('stubs', function () {
        var fakeClient, apiClient, vanilliEnvironment;

        beforeEach(function () {
            vanilliEnvironment = vanilli.startVanilli({ apiPort: apiPort, fakePort: fakePort, logLevel: vanilliLogLevel });
            apiClient = request(vanilliEnvironment.apiServer);
            fakeClient = request(vanilliEnvironment.fakeServer);
        });

        afterEach(function () {
            vanilliEnvironment.stop();
        });

        it('MUST have a url', function (done) {
            apiClient.post('/expect')
                .set('Content-Type', 'application/json')
                .send({
                    criteria: {
                    },
                    respondWith: {
                        entity: { something: "else" },
                        "Content-Type": "application/json"
                    }
                })
                .expect(400, /url/, done);
        });

        it('MUST have a contentType if a response entity is specified', function (done) {
            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: 'my/url'
                    },
                    respondWith: {
                        status: 200,
                        entity: {
                            something: "else"
                        }
                    }
                })
                .expect(400, /contentType/, done);
        });

        it('CAN have no response content type if there is no response entity', function (done) {
            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: 'my/url'
                    },
                    respondWith: {
                        status: 200
                    }
                })
                .expect(200, done);
        });

        it('MUST match against request with a matching url', function (done) {
            var expectedStatus = 234,
                url = "/my/url";

            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: url
                    },
                    respondWith: {
                        status: expectedStatus
                    }
                })
                .end(function (err) {
                    if (err) return done(err);

                    fakeClient.get(url)
                        .expect(expectedStatus, done);
                });
        });

        it('MUST match against request with the same method', function (done) {
            var expectedStatus = 234,
                url = "/my/url";

            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: url,
                        method: 'DELETE'
                    },
                    respondWith: {
                        status: expectedStatus
                    }
                })
                .end(function (err) {
                    if (err) return done(err);

                    fakeClient.del(url)
                        .expect(expectedStatus, done);
                });
        });

        it("MUST match against request with headers that are included in the stub");
        it("MUST match against request with the same response entity");
        it("MUST match against request where the response entity fulfills the matching criteria specified by a function specified in the stub");
    });

    describe('requests', function () {
        var fakeClient, apiClient, vanilliEnvironment;

        beforeEach(function () {
            vanilliEnvironment = vanilli.startVanilli({ apiPort: apiPort, fakePort: fakePort, logLevel: vanilliLogLevel });
            apiClient = request(vanilliEnvironment.apiServer);
            fakeClient = request(vanilliEnvironment.fakeServer);
        });

        afterEach(function () {
            vanilliEnvironment.stop();
        });

        it('MUST honour a "get" request if it matches a stub', function (done) {
            var expectedStatus = 234;

            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: dummyUrl,
                        method: 'GET'
                    },
                    respondWith: {
                        status: expectedStatus
                    }
                })
                .end(function (err) {
                    if (err) return done(err);

                    fakeClient.get(dummyUrl)
                        .expect(expectedStatus, done);
                });
        });

        it('MUST honour a "delete" request if it matches a stub', function (done) {
            var expectedStatus = 234;

            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: dummyUrl,
                        method: 'DELETE'
                    },
                    respondWith: {
                        status: expectedStatus
                    }
                })
                .end(function (err) {
                    if (err) return done(err);

                    fakeClient.del(dummyUrl)
                        .expect(expectedStatus, done);
                });
        });

        it('MUST honour a "post" request if it matches a stub', function (done) {
            var expectedStatus = 234;

            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: dummyUrl,
                        method: 'POST'
                    },
                    respondWith: {
                        status: expectedStatus
                    }
                })
                .end(function (err) {
                    if (err) return done(err);

                    fakeClient.post(dummyUrl)
                        .expect(expectedStatus, done);
                });
        });

        it('MUST honour a "put" request if it matches a stub', function (done) {
            var expectedStatus = 234;

            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: dummyUrl,
                        method: 'PUT'
                    },
                    respondWith: {
                        status: expectedStatus
                    }
                })
                .end(function (err) {
                    if (err) return done(err);

                    fakeClient.put(dummyUrl)
                        .expect(expectedStatus, done);
                });
        });
    });

    describe('responses', function () {
        var fakeClient, apiClient, vanilliEnvironment;

        beforeEach(function () {
            vanilliEnvironment = vanilli.startVanilli({ apiPort: apiPort, fakePort: fakePort, logLevel: vanilliLogLevel });
            apiClient = request(vanilliEnvironment.apiServer);
            fakeClient = request(vanilliEnvironment.fakeServer);
        });

        afterEach(function () {
            vanilliEnvironment.stop();
        });

        it('MUST have the status specified in the matching stub', function (done) {
            var expectedStatus = 234;

            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: dummyUrl
                    },
                    respondWith: {
                        status: expectedStatus
                    }
                })
                .end(function (err) {
                    if (err) return done(err);

                    fakeClient.get(dummyUrl)
                        .expect(expectedStatus, done);
                });
        });

        it('MUST have the entity specified in the matching stub', function (done) {
            var expectedEntity = {
                some: "data"
            };

            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: dummyUrl
                    },
                    respondWith: {
                        status: dummyStatus,
                        entity: expectedEntity,
                        contentType: "application/json"
                    }
                })
                .end(function (err) {
                    if (err) return done(err);

                    fakeClient.get(dummyUrl)
                        .expect(dummyStatus, expectedEntity, done);
                });
        });

        it('MUST have the content type specified in the matching stub', function (done) {
            var expectedContentType = "text/plain";

            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: dummyUrl
                    },
                    respondWith: {
                        status: dummyStatus,
                        entity: "some data",
                        contentType: expectedContentType
                    }
                })
                .end(function (err) {
                    if (err) return done(err);

                    fakeClient.get(dummyUrl)
                        .expect("Content-Type", expectedContentType, done);
                });
        });

        it('MUST have the headers specified in the matching stub', function (done) {
            var expectedHeaderValue = "myvalue";

            apiClient.post('/expect')
                .send({
                    criteria: {
                        url: dummyUrl
                    },
                    respondWith: {
                        status: dummyStatus,
                        headers: {
                            "My-Header": expectedHeaderValue
                        }
                    }
                })
                .end(function (err) {
                    if (err) return done(err);

                    fakeClient.get(dummyUrl)
                        .expect("My-Header", expectedHeaderValue, done);
                });
        });
    });
});
