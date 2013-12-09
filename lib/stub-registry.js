var _ = require("lodash"),
    uuid = require('node-uuid');

exports.create = function (appLog) {
    function StubRegistry(appLog) {

        var registry = [],
            captures = {},
            log = appLog.child({ component: "StubRegistry" });

        function validateForRegistry(stub) {
            if (!stub.criteria) {
                throw new Error("criteria must be specified.");
            }

            if (!stub.criteria.url) {
                throw new Error("url must be specified in the criteria.");
            }

            if ((typeof stub.criteria.url == 'string') && (stub.criteria.url.indexOf("?") > -1)) {
                throw new Error("REJECTED stub '" + stub.id + "' on url - specify querystring separately.");
            }

            if (stub.criteria.body && !stub.criteria.contentType) {
                throw new Error("the contentType for a criteria body must be specified.");
            }

            if (!stub.respondWith) {
                throw new Error("respondWith must be specified.");
            }

            if (!stub.respondWith.status) {
                throw new Error("status must be specified in the respondWith.");
            }

            if (stub.respondWith.body && !stub.respondWith.contentType) {
                throw new Error("the respondWith contentType for a body must be specified.");
            }

            if (_.isString(stub.criteria.url) && (stub.criteria.url.substr(0, 1) !== "/")) {
                stub.criteria.url = "/" + stub.criteria.url;
            }
        }

        function initialiseStub(stub) {
            function assignContentTypeOn(object) {
                if (object.headers && object.headers["Content-Type"]) {
                    object.contentType = object.headers["Content-Type"];
                }
            }

            if (!stub.criteria.method) {
                stub.criteria.method = "GET";
            }

            assignContentTypeOn(stub.criteria);
            assignContentTypeOn(stub.respondWith);

            stub.matched = 0;
            stub.id = uuid.v4();
        }

        function asString(request) {
            return request.method + " " + request.url;
        }

        this.addStub = function (stub) {
            validateForRegistry(stub);
            initialiseStub(stub);

            log.debug("Stored stub: " + JSON.stringify(stub));

            registry.push(stub);

            return stub;
        };

        this.getById = function (stubId) {
            var matches = registry.filter(function (stub) {
                return stub.id === stubId;
            });

            if (matches.length > 0) {
                return matches[0];
            } else {
                return null;
            }
        };

        this.clear = function () {
            registry.length = 0;
            captures = {};

            log.debug("Registry cleared.");
        };

        this.verifyExpectations = function () {
            var errors = [];

            registry.filter(
                function (stub) {
                    return stub.expect;
                }).forEach(function (expectation) {
                    if (expectation.times !== expectation.matched) {
                        var message = asString(expectation.criteria) + " - Expected: " + expectation.times + "; Actual: " + expectation.matched;
                        log.debug("VERIFICATION FAILED: " + message);
                        errors.push(message);
                    }
                });

            return errors;
        };

        this.findMatchFor = function (request) {
            function buildQueryObject(queryString) {
                var queryObject = {};
                queryString.split("&").forEach(function (queryParam) {
                    var pair = queryParam.split("=");
                    queryObject[pair[0]] = pair[1];
                });
                return queryObject;
            }

            var requestPath = request.path(),
                requestUrl = ((requestPath.substr(0, 1) !== "/") ? "/" : "") + requestPath,
                match;

            log.debug("REQUEST: " + request.method + " " + requestUrl);

            var matchingStubs = registry.filter(function (stub) {
                if (!requestUrl.match(stub.criteria.url)) {
                    log.debug("REJECTED stub '" + stub.id + "' on url [Expected: " + stub.criteria.url + "; Actual: " + requestUrl + "]");
                    return false;
                }

                if (stub.criteria.method && (request.method.toLowerCase() !== stub.criteria.method.toLowerCase())) {
                    log.debug("REJECTED stub '" + stub.id + "' on method [Expected: " + stub.criteria.method + "; Actual: " + request.method + "]");
                    return false;
                }

                if (stub.criteria.headers) {
                    var rejectedHeader = _.keys(stub.criteria.headers).filter(function (headerName) {
                        var headerValue = request.headers[headerName.toLowerCase()];
                        return !headerValue || !headerValue.match(stub.criteria.headers[headerName]);
                    });

                    if (rejectedHeader.length > 0) {
                        var headerName = rejectedHeader[0];
                        log.debug("REJECTED stub '" + stub.id + "' on header '" + headerName + "' [Expected: '" +
                            stub.criteria.headers[headerName] + "'; Actual: '" + request.headers[headerName] + "']");
                        return false;
                    }
                }

                if (stub.criteria.query) {
                    if (!request.query) {
                        log.debug("REJECTED stub '" + stub.id + "' - request had no query.");
                        return false;
                    }

                    var requestQuery = buildQueryObject(request.query),
                        rejectedParam = _.keys(stub.criteria.query).filter(function (paramName) {
                            var paramValue = requestQuery[paramName];
                            return !paramValue || !paramValue.match(stub.criteria.query[paramName]);
                        });

                    if (rejectedParam.length > 0) {
                        var paramName = rejectedParam[0];
                        log.debug("REJECTED stub '" + stub.id + "' on query param '" + paramName + "' [Expected: '" +
                            stub.criteria.query[paramName] + "'; Actual: '" + requestQuery[paramName] + "']");
                        return false;
                    }
                }

                if (stub.criteria.body) {
                    if (_.isFunction(stub.criteria.body)) {
                        if (!stub.criteria.body(request.body)) {
                            log.debug("REJECTED stub '" + stub.id + "' on body [Expected: body matched by function; Actual: " + request.body + "]");
                            return false;
                        }

                    } else if (!JSON.stringify(request.body).match(stub.criteria.body)) {
                        log.debug("REJECTED stub '" + stub.id + "' on body [Expected: '" + stub.criteria.body + "'; Actual: " + JSON.stringify(request.body) + "]");
                        return false;

                    } else if (stub.criteria.contentType !== request.contentType()) {
                        log.debug("REJECTED stub '" + stub.id + "' on body content type [Expected: '" + stub.criteria.contentType + "'; Actual: " + request.contentType() + "]");
                        return false;
                    }
                }

                if (!stub.expect && (stub.matched === stub.times)) {
                    log.debug("REJECTED stub '" + stub.id + "' on stub has already been matched " + stub.matched + " times.");
                    return false;
                }

                return true;
            });

            if (matchingStubs.length > 0) {
                match = matchingStubs[0];
                log.debug("MATCHED request " + asString(request) + " against stub: " + JSON.stringify(match));

                match.matched++;

                if (match.capture) {
                    log.debug("CAPTURED request as capture with id '" + match.capture + "'.");
                    captures[match.capture] = request;
                }

                return match;

            } else {
                return null;
            }
        };

        this.getCapture = function (captureId) {
            return captures[captureId];
        };

        this.clear();
    }

    return new StubRegistry(appLog);
};