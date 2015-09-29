/* jshint expr:true */
var vanilli = require('../../lib/vanilli').init({
        logLevel: "error",
        static: {
            root: "test/e2e/static",
            "default": "something.html",
            include: [ "**/*.html", { path: '/foo', target: 'foo.html' }, { path: '/bar', useDefault: true } ],
            exclude: [ "**/*.xxx" ]
        }
    }),
    chai = require('chai'),
    expect = require('chai').expect,
    portfinder = require('portfinder');

portfinder.basePort = 14000;

chai.config.includeStack = true;
chai.use(require('chai-http'));

describe('Vanilli', function () {
    var client,
        dummyStatus = 666,
        dummyUrl = "/some/url";

    before(function (done) {
        portfinder.getPort(function (err, port) {
            if (err) {
                done(err);
            } else {
                vanilli.listen(port);
                client = chai.request("http://localhost:" + port);
                done();
            }
        });
    });

    after(function () {
        vanilli.stop();
    });

    afterEach(function () {
        vanilli.clear();
    });

    it('listens on the configured port', function (done) {
        client.get('/_vanilli/ping')
            .end(function (err, res) {
                expect(res).to.be.json;
                expect(res).to.have.status(200);
                expect(res.body.ping).to.equal("pong");
                done();
            });
    });

    it('serves up the stub matching the incoming request', function (done) {
        vanilli.stub(
            vanilli.onGet("/another/url").respondWith(123),
            vanilli.onGet("/my/url").respondWith(234),
            vanilli.onGet("/yet/another/url").respondWith(345)
        );

        client.get("/my/url")
            .end(function (err, res) {
                expect(res).to.have.status(234);
                done();
            });
    });

    it('serves up the stub matching the incoming request containing repeated query param', function (done) {
        vanilli.stub(
            vanilli.onGet("/my/url", { query: { param1: [ "a", "b" ] } }).respondWith(123)
        );

        client.get("/my/url?param1=a&param1=b")
            .end(function (err, res) {
                expect(res).to.have.status(123);
                done();
            });
    });

    it('serves up the stub matching the correct priority', function (done) {
        vanilli.stub(
            vanilli.onGet("/my/url", { priority: 1 }).respondWith(123),
            vanilli.onGet("/my/url").respondWith(234)
        );

        client.get("/my/url")
            .end(function (err, res) {
                expect(res).to.have.status(234);
                done();
            });
    });

    it('serves up the last matched stub, rather than the first', function (done) {
        vanilli.stub(
            vanilli.onGet("/my/url").respondWith(123),
            vanilli.onGet("/my/url").respondWith(234)
        );

        client.get("/my/url")
            .end(function (err, res) {
                expect(res).to.have.status(234);
                done();
            });
    });

    it('adds headers from matching stub to response', function (done) {
        vanilli.stub(
            vanilli.onGet(dummyUrl).respondWith(dummyStatus, {
                headers: {
                    myheader1: "value1",
                    myheader2: "value2"
                }
            })
        );

        client.get(dummyUrl)
            .end(function (err, res) {
                expect(res).to.have.header("myheader1", "value1");
                expect(res).to.have.header("myheader2", "value2");
                done();
            });
    });

    it('adds body from matching stub to response', function (done) {
        vanilli.stub(
            vanilli.onGet(dummyUrl).respondWith(dummyStatus, {
                body: {
                    some: "content"
                },
                contentType: "application/json"
            })
        );

        client.get(dummyUrl)
            .end(function (err, res) {
                expect(res.body).to.deep.equal({ some: "content" });
                expect(res).to.have.header('content-type', "application/json");
                done();
            });
    });

    it('overrides explicit Content-Type header with content type of body', function (done) {
        vanilli.stub(
            vanilli.onGet(dummyUrl).respondWith(dummyStatus, {
                body: {
                    some: "content"
                },
                contentType: "application/json",
                headers: {
                    "Content-Type": "something/else"
                }
            })
        );

        client.get(dummyUrl)
            .end(function (err, res) {
                expect(res).to.have.header('content-type', "application/json");
                done();
            });
    });

    it('serves up 500 if no matching stub is found', function (done) {
        vanilli.stub(
            vanilli.onGet("/my/url").respondWith(dummyStatus)
        );

        client.get("/another/url")
            .end(function (err, res) {
                expect(res).to.have.status(404);
                done();
            });
    });

    it('can be cleared down of stubs', function (done) {
        vanilli.stub(
            vanilli.onGet(dummyUrl).respondWith(123)
        );

        vanilli.clear();

        client.get(dummyUrl)
            .end(function (err, res) {
                expect(res).to.have.status(404);
                done();
            });
    });

    it('uses CORS to allow requests to vanilli from other ports', function (done) {
        vanilli.stub(
            vanilli.onGet(dummyUrl).respondWith(dummyStatus)
        );

        client.get(dummyUrl)
            .end(function (err, res) {
                expect(res).to.have.header('access-control-allow-origin', "*");
                done();
            });
    });

    it('echoes specified request headers back as access-control-allow-headers header for CORS preflight request', function (done) {
        vanilli.stub(
            vanilli.onGet(dummyUrl).respondWith(dummyStatus)
        );

        client.options(dummyUrl)
            .set("access-control-request-headers", "header1, header2, header3")
            .end(function (err, res) {
                expect(res).to.have.header('access-control-allow-headers', "header1, header2, header3");
                done();
            });
    });

    it('echoes specified request method back as access-control-allow-methods header for CORS preflight request', function (done) {
        vanilli.stub(
            vanilli.onGet(dummyUrl).respondWith(dummyStatus)
        );

        client.options(dummyUrl)
            .set("access-control-request-methods", "DELETE")
            .end(function (err, res) {
                expect(res).to.have.header('access-control-allow-methods', "DELETE");
                done();
            });
    });

    it('does not echo back CORS preflight response headers for non-preflight request', function (done) {
        vanilli.stub(
            vanilli.onGet(dummyUrl).respondWith(dummyStatus)
        );

        client.get(dummyUrl)
            .end(function (err, res) {
                expect(res).not.to.have.header('access-control-allow-methods');
                expect(res).not.to.have.header('access-control-allow-headers');
                done();
            });
    });

    it("only responds after waiting the length of time specified by the stub", function (done) {
        vanilli.stub(
            vanilli.onGet(dummyUrl).respondWith(dummyStatus)
                .wait(200)
        );

        var startResponse = (new Date()).getTime();

        client.get(dummyUrl)
            .buffer()
            .end(function () {
                var endResponse = (new Date()).getTime();
                expect(endResponse - startResponse).to.be.greaterThan(200);
                done();
            });
    });

    it("supports 'wait' specified before 'respondWith' syntactic sugar", function (done) {
        vanilli.stub(
            vanilli.onGet(dummyUrl).wait(200).respondWith(dummyStatus)
        );

        var startResponse = (new Date()).getTime();

        client.get(dummyUrl)
            .buffer()
            .end(function () {
                var endResponse = (new Date()).getTime();
                expect(endResponse - startResponse).to.be.greaterThan(200);
                done();
            });
    });

    it('uses correct content type for response when content type not supported by a registered restify formatter', function (done) {
        vanilli.stub(
            vanilli.onGet(dummyUrl).respondWith(dummyStatus, {
                body: "<html><body>some page</body></html>",
                contentType: "text/html"
            })
        );

        client.get(dummyUrl)
            .buffer()
            .end(function (err, res) {
                expect(res.text).to.equal('<html><body>some page</body></html>');
                expect(res.header['content-type']).to.equal("text/html");
                done();
            });
    });

    it('can parse custom content-types for request and responses', function (done) {
        vanilli.stub(
            vanilli.onPost(dummyUrl, { body: { a: 'A' }, contentType: 'application/vnd.custom+json' })
                .respondWith(123, { contentType: "application/vnd.custom2+json" })
        );

        client.post(dummyUrl)
            .type('application/vnd.custom+json')
            .send(JSON.stringify({ a: 'A' }))
            .end(function (err, res) {
                expect(res).to.have.status(123);
                expect(res.header['content-type']).to.equal('application/vnd.custom2+json');
                done();
            });
    });

    it('can match stubs on post body, despite extra fields', function (done) {
        vanilli.stub(
            vanilli.onPost(dummyUrl, { body: { a: 'A' }, contentType: 'application/json' })
                .respondWith(123)
        );

        client.post(dummyUrl)
            .send({ a: 'A', b: 'B' })
            .end(function (err, res) {
                expect(res).to.have.status(123);
                done();
            });
    });

    it('can serve HEAD requests', function (done) {
        vanilli.stub(
            vanilli.onHead(dummyUrl)
                .respondWith(123)
        );

        client.head(dummyUrl)
            .end(function (err, res) {
                expect(res).to.have.status(123);
                done();
            });
    });

    describe('static content', function () {
        it('is served if request meets criteria of static filter', function (done) {
            client.get('/something.html')
                .end(function (err, res) {
                    expect(res).to.have.status(200);
                    done();
                });
        });

        it('is not served if request meets include criteria but not excludes', function (done) {
            client.get('/exists.xxx')
                .end(function (err, res) {
                    expect(res).to.have.status(404);
                    done();
                });
        });

        it('serves up 404 if request meets criteria of static filter but no matching static content exists', function (done) {
            client.get('/doesnotexist.html')
                .end(function (err, res) {
                    expect(res).to.have.status(404);
                    done();
                });
        });

        it('serves up default resource for / path', function (done) {
            client.get('/')
                .end(function (err, res) {
                    expect(res).to.have.status(200);
                    done();
                });
        });

        it('serves up default resource for no path', function (done) {
            client.get('')
                .end(function (err, res) {
                    expect(res).to.have.status(200);
                    done();
                });
        });

        it('serves up default resource proxy routes using default as target', function (done) {
            client.get('/foo')
                .end(function (err, res) {
                    expect(res).to.have.status(200);
                    done();
                });
        });

        it('serves up specified target resource for proxy route if request meets criteria of static filter', function (done) {
            client.get('/bar')
                .end(function (err, res) {
                    expect(res).to.have.status(200);
                    done();
                });
        });
    });

    describe('JSONP', function () {
        it('is used to wrap response non-json entity as string passed to specified callback', function (done) {
            vanilli.stub(
                vanilli.onGet("/my/url").respondWith(dummyStatus, {
                    body: "somecontent",
                    contentType: "text/plain"
                })
            );

            client.get("/my/url?callback=mycallback")
                .buffer()
                .end(function (err, res) {
                    expect(res).to.have.header('content-type', "application/javascript");
                    expect(res.text).to.equal("mycallback(\"somecontent\");");
                    done();
                });
        });

        it('is used to wrap json response json entity as and object passed to specified callback', function (done) {
            vanilli.stub(
                vanilli.onGet("/my/url").respondWith(dummyStatus, {
                    body: {
                        some: "content"
                    },
                    contentType: "application/json"
                })
            );

            client.get("/my/url?callback=mycallback")
                .buffer()
                .end(function (err, res) {
                    expect(res).to.have.header('content-type', "application/javascript");
                    expect(res.text).to.equal("mycallback({\"some\":\"content\"});");
                    done();
                });
        });
    });


    describe('captures', function () {
        describe('getting the most recent capture', function () {
            it('contain request entity itself', function (done) {
                var captureId = "mycapture";

                vanilli.stub(
                    vanilli.onPost("/my/url")
                        .respondWith(dummyStatus)
                        .capture(captureId)
                );

                client.post('/my/url')
                    .send({ some: "content" })
                    .end(function () {
                        var capture = vanilli.getCapture(captureId);
                        expect(capture.body).to.deep.equal({ some: "content" });
                        expect(capture.contentType).to.deep.equal("application/json");

                        done();
                    });
            });

            it('contain request headers', function (done) {
                var captureId = "mycapture";

                vanilli.stub(
                    vanilli.onPost("/my/url")
                        .respondWith(dummyStatus)
                        .capture(captureId)
                );

                client.post('/my/url')
                    .set('My-Header', "myvalue")
                    .send("somecontent")
                    .end(function () {
                        client.get('/_vanilli/captures/' + captureId)
                            .end(function () {
                                var capture = vanilli.getCapture(captureId);

                                expect(capture.headers["my-header"]).to.equal("myvalue");

                                done();
                            });
                    });
            });

            it('contain query params', function (done) {
                var captureId = "mycapture";

                vanilli.stub(
                    vanilli.onPost("/my/url")
                        .respondWith(dummyStatus)
                        .capture(captureId)
                );

                client.post('/my/url?param1=value1&param2=value2')
                    .send("somecontent")
                    .end(function () {
                        client.get('/_vanilli/captures/' + captureId)
                            .end(function () {
                                var capture = vanilli.getCapture(captureId);

                                expect(capture.query).to.deep.equal({
                                    param1: "value1",
                                    param2: "value2"
                                });

                                done();
                            });
                    });
            });
        });
    });

    describe('getting all captures for a given capture id', function () {
        it('returns an empty array if no captures', function () {
            expect(vanilli.getCaptures('foo')).to.eql([]);
        });

        it('returns an array of captures', function (done) {
            var captureId = "mycapture";

            vanilli.stub(
                vanilli.onPost("/my/url")
                    .respondWith(dummyStatus, { times: 2 })
                    .capture(captureId)
            );

            client.post('/my/url')
                .send({ some: "content" })
                .end();
            client.post('/my/url')
                .send({ some: "other content" })
                .end(function () {
                    var captures = vanilli.getCaptures(captureId);

                    expect(captures).to.have.length(2);
                    expect(captures[0].body).to.deep.equal({ some: "content" });
                    expect(captures[1].body).to.deep.equal({ some: "other content" });

                    done();
                });
        });

    });
});
