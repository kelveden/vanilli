var expect = require('chai').expect,
    sinon = require('sinon'),
    vanilli = require('../../lib/vanilli').init({ logLevel: "error" });

describe("vanilli", function () {

    var dummyUrl = "/some/url",
        dummyStatus = 234;

    describe("listening", function () {
        it("throws an error if no port is specified", function () {
            expect(function () {
                vanilli.listen();
            }).to.throw(/port/i);
        });
    });

    describe("criteria builder", function () {
        it("adds the GET HTTP method to the stub", function () {
            var stub = vanilli.onGet("/some/url");
            expect(stub.criteria.method).to.equal("GET");
        });

        it("adds the POST HTTP method to the stub", function () {
            var stub = vanilli.onPost("/some/url");
            expect(stub.criteria.method).to.equal("POST");
        });

        it("adds the PUT HTTP method to the stub", function () {
            var stub = vanilli.onPut("/some/url");
            expect(stub.criteria.method).to.equal("PUT");
        });

        it("adds the DELETE HTTP method to the stub", function () {
            var stub = vanilli.onDelete("/some/url");
            expect(stub.criteria.method).to.equal("DELETE");
        });

        it("adds the specified URL criteria to the stub", function () {
            var stub = vanilli.onGet("/some/url");
            expect(stub.criteria.url).to.equal("/some/url");
        });

        it("unwraps the specified URL regexp criteria as a vanilla string", function () {
            var stub = vanilli.onGet(/.+/);
            expect(stub.criteria.url).to.deep.equal({ regex: ".+" });
        });

        it("adds the specified content-type criteria to the stub", function () {
            var stub = vanilli.onGet("/some/url", {
                contentType: "my/contenttype"
            });

            expect(stub.criteria.contentType).to.equal("my/contenttype");
        });

        it("adds the specified body criteria to the stub", function () {
            var stub = vanilli.onGet("/some/url", {
                contentType: "application/json",
                body: {
                    some: "body"
                }
            });

            expect(stub.criteria.body).to.deep.equal({
                some: "body"
            });
        });

        it("unwraps the specified body regexp criteria as a vanilla string", function () {
            var stub = vanilli.onGet("/some/url", {
                contentType: "application/json",
                body: /.+/
            });

            expect(stub.criteria.body).to.deep.equal({ regex: ".+" });
        });

        it("stringifies a body object if content-type is not application/json", function () {
            var stub = vanilli.onGet("/some/url", {
                contentType: "not/applicationjson",
                body: {
                    some: "body"
                }
            });

            expect(stub.criteria.body).to.equal("{\"some\":\"body\"}");
        });

        it("throws an exception if a body is specified without a content-type", function () {
            expect(function () {
                vanilli.onGet("/some/url", {
                    body: {
                        some: "body"
                    }
                });
            }).to.throw(/content-type was missing/);
        });

        it("adds the specified query param criteria to the stub", function () {
            var stub = vanilli.onGet("/some/url", {
                query: {
                    param1: "value1"
                }
            });

            expect(stub.criteria.query).to.deep.equal({
                param1: "value1"
            });
        });

        it("adds multiple query param criteria to the stub", function () {
            var stub = vanilli.onGet("/some/url", {
                query: {
                    param1: "value1",
                    param2: "value2"
                }
            });

            expect(stub.criteria.query).to.deep.equal({
                param1: "value1",
                param2: "value2"
            });
        });

        it("unwraps the specified query param regexp criteria as a vanilla string", function () {
            var stub = vanilli.onGet("/some/url", {
                query: {
                    param1: /.+/
                }
            });

            expect(stub.criteria.query).to.deep.equal({
                param1: {
                    regex: ".+"
                }
            });
        });

        it("adds the specified header criteria to the stub", function () {
            var stub = vanilli.onGet("/some/url", {
                headers: {
                    header1: "value1"
                }
            });

            expect(stub.criteria.headers).to.deep.equal({
                header1: "value1"
            });
        });

        it("adds multiple header criteria to the stub", function () {
            var stub = vanilli.onGet("/some/url", {
                headers: {
                    header1: "value1",
                    header2: "value2"
                }
            });

            expect(stub.criteria.headers).to.deep.equal({
                header1: "value1",
                header2: "value2"
            });
        });

        it("unwraps the specified header regexp criteria as a vanilla string", function () {
            var stub = vanilli.onGet("/some/url", {
                headers: {
                    header1: /.+/
                }
            });

            expect(stub.criteria.headers).to.deep.equal({
                header1: {
                    regex: ".+"
                }
            });
        });

        it("throws an exception if url is null", function () {
            expect(function () {
                vanilli.onGet(null);
            }).to.throw(/url is missing/i);
        });

        it("throws an exception if url is undefined", function () {
            expect(function () {
                vanilli.onGet();
            }).to.throw(/url is missing/i);
        });
    });

    describe("response builder", function () {
        it("adds the specified status to the response", function () {
            var stub = vanilli.onGet(dummyUrl).respondWith(123);

            expect(stub.response.status).to.equal(123);
        });

        it("adds the specified content-type to the response", function () {
            var stub = vanilli.onGet(dummyUrl)
                .respondWith(dummyStatus, {
                    contentType: "my/contenttype"
                });

            expect(stub.response.contentType).to.equal("my/contenttype");
        });

        it("adds the specified body to the response", function () {
            var stub = vanilli.onGet(dummyUrl)
                .respondWith(dummyStatus, {
                    contentType: "application/json",
                    body: {
                        some: "body"
                    }
                });

            expect(stub.response.body).to.deep.equal({
                some: "body"
            });
        });

        it("adds the specified headers to the response", function () {
            var stub = vanilli.onGet(dummyUrl)
                .respondWith(dummyStatus, {
                    headers: {
                        header1: "value1",
                        header2: "value2"
                    }
                });

            expect(stub.response.headers).to.deep.equal({
                header1: "value1",
                header2: "value2"
            });
        });

        it("stringifies a body object if content-type is not application/json", function () {
            var stub = vanilli.onGet("/some/url")
                .respondWith(dummyStatus, {
                    contentType: "not/applicationjson",
                    body: {
                        some: "body"
                    }
                });

            expect(stub.response.body).to.equal("{\"some\":\"body\"}");
        });

        it("throws an exception if status code is null", function () {
            expect(function () {
                vanilli.onGet("/some/url").respondWith(null);
            }).to.throw(/status code is missing/i);
        });

        it("throws an exception if status code is undefined", function () {
            expect(function () {
                vanilli.onGet("/some/url").respondWith();
            }).to.throw(/status code is missing/i);
        });

        it("throws an exception if a body is specified without a content-type", function () {
            expect(function () {
                vanilli.onGet("/some/url")
                    .respondWith(dummyStatus, {
                        body: {
                            some: "body"
                        }
                    });
            }).to.throw(/content-type was missing/);
        });

        it("adds specified response wait to stub", function () {
            var stub = vanilli.onGet("/some/url")
                .respondWith(123)
                .wait(2000);

            expect(stub.response.wait).to.equal(2000);
        });

        it("adds number of times for the stub to respond", function () {
            var stub = vanilli.onGet("/some/url")
                .respondWith(123, {
                    times: 3
                });

            expect(stub.times).to.equal(3);
        });

        it("assumes number of times is 1 if not specified", function () {
            var stub = vanilli.onGet("/some/url")
                .respondWith(123);

            expect(stub.times).to.equal(1);
        });

        it("assigns specified capture id to stub", function () {
            var stub = vanilli.onGet("/some/url")
                .respondWith(123)
                .capture("mycapture");

            expect(stub.captureId).to.equal("mycapture");
        });
    });

    describe("stubs", function () {
        it("can be added", function () {
            var stubs =
                vanilli.stub(
                    vanilli.onGet("/some/url").respondWith(123));

            expect(stubs).to.have.length(1);
            expect(stubs[0].id).not.to.be.undefined();
        });

        it("can be added in one go", function () {
            var stubs =
                vanilli.stub(
                    vanilli.onGet("/some/url").respondWith(123),
                    vanilli.onGet("/another/url").respondWith(456));

            expect(stubs).to.have.length(2);
            expect(stubs[0].id).not.to.be.undefined();
            expect(stubs[0].criteria.url).to.equal("/some/url");
            expect(stubs[1].id).not.to.be.undefined();
            expect(stubs[1].criteria.url).to.equal("/another/url");
        });

        it("can be cleared", function () {
            vanilli.stub(
                vanilli.onGet("/some/url").respondWith(123),
                vanilli.onGet("/another/url").respondWith(456));

            vanilli.clear();
        });

        it("cannot be verified", function () {
            vanilli.stub(
                vanilli.onGet("/some/url").respondWith(123));

            expect(vanilli.verify()).to.have.length(0);
        });
    });

    describe("expectations", function () {
        it("can be added", function () {
            var stubs =
                vanilli.expect(
                    vanilli.onGet("/some/url").respondWith(123));

            expect(stubs).to.have.length(1);
            expect(stubs[0].id).not.to.be.undefined();
            expect(stubs[0].expect).to.be.true();
        });

        it("can be added in one go", function () {
            var stubs =
                vanilli.expect(
                    vanilli.onGet("/some/url").respondWith(123),
                    vanilli.onGet("/another/url").respondWith(456));

            expect(stubs).to.have.length(2);
            expect(stubs[0].id).not.to.be.undefined();
            expect(stubs[0].criteria.url).to.equal("/some/url");
            expect(stubs[0].expect).to.be.true();
            expect(stubs[1].id).not.to.be.undefined();
            expect(stubs[1].criteria.url).to.equal("/another/url");
            expect(stubs[1].expect).to.be.true();
        });

        it("can be cleared", function () {
            vanilli.expect(
                vanilli.onGet("/some/url").respondWith(123),
                vanilli.onGet("/another/url").respondWith(456));

            vanilli.clear();
        });

        it("can be verified", function () {
            vanilli.expect(
                vanilli.onGet("/some/url").respondWith(123));

            expect(vanilli.verify()).to.have.length(1);
        });
    });
});
