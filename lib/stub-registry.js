var _ = require("lodash"),
    uuid = require('node-uuid');

exports.create = function (appLog) {
    function StubRegistry(appLog) {

        var registry = [],
            captures = {},
            log = appLog.child({ component: "stub-registry" });

        function validateForRegistry(stub) {
            if (!stub.criteria) {
                throw new Error("criteria must be specified.");
            }

            if (!stub.criteria.url) {
                throw new Error("url must be specified in the criteria.");
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

            function unescapeUrl (stub) {
                stub.criteria.url = decodeURIComponent(stub.criteria.url);
                if (stub.criteria.query) {
                    _.keys(stub.criteria.query).forEach(function (queryParam) {
                        stub.criteria.query[queryParam] = decodeURIComponent(stub.criteria.query[queryParam]);
                    });
                }
            }

            unescapeUrl(stub);
            assignContentTypeOn(stub.criteria);
            assignContentTypeOn(stub.respondWith);

            stub.matched = 0;
            stub.id = uuid.v4();
        }

        function asString(request) {
            return request.method + " " + request.url;
        }

        function storeCapture(captureId, request) {
            log.info("CAPTURED request as capture with id '" + captureId + "'.");

            captures[captureId] = {
                body: request.body,
                headers: request.headers,
                query: request.query,
                contentType: request.contentType()
            };
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
                        log.error("VERIFICATION FAILED: " + message);
                        errors.push(message);
                    }
                });

            return errors;
        };

        this.findMatchFor = function (request) {
            function bodiesMatch (request, stub) {
                function objectAsString (thing) {
                    return (typeof thing === 'object') ? JSON.stringify(thing) : thing;
                }

                if (stub.criteria.body) {
                    if (!request.body) {
                        log.debug("REJECTED stub '" + stub.id + "' on body [Expected: '" + stub.criteria.body + "'; Actual: " + request.body + "]");
                        return false;

                    } else if (
                        (stub.criteria.body.regex && !objectAsString(request.body).match(stub.criteria.body.regex)) ||
                        (!stub.criteria.body.regex && objectAsString(stub.criteria.body) !== objectAsString(request.body))) {

                        log.debug("REJECTED stub '" + stub.id + "' on body [Expected: '" + stub.criteria.body + "'; Actual: " + request.body + "]");
                        return false;

                    } else if (stub.criteria.contentType !== request.contentType()) {
                        log.debug("REJECTED stub '" + stub.id + "' on body content type [Expected: '" + stub.criteria.contentType + "'; Actual: " + request.contentType() + "]");
                        return false;
                    }
                }

                return true;
            }

            function queriesMatch (request, stub) {
                if (stub.criteria.query) {
                    var requestQuery = request.query,
                        rejectedParam = _.keys(stub.criteria.query).filter(function (paramName) {
                            var paramValue = requestQuery[paramName];
                            return !paramValue || !paramValue.match(
                                wholeStringRegex(stub.criteria.query[paramName]));
                        });

                    if (rejectedParam.length > 0) {
                        var paramName = rejectedParam[0];
                        log.debug("REJECTED stub '" + stub.id + "' on query param '" + paramName + "' [Expected: '" +
                            stub.criteria.query[paramName] + "'; Actual: '" + requestQuery[paramName] + "']");
                        return false;
                    }
                }

                return true;
            }

            function headersMatch (request, stub) {
                if (stub.criteria.headers) {

                    var rejectedHeader = _.keys(stub.criteria.headers).filter(function (headerName) {
                        var headerValue = request.headers[headerName.toLowerCase()];
                        return !headerValue || !headerValue.match(
                            wholeStringRegex(stub.criteria.headers[headerName]));
                    });

                    if (rejectedHeader.length > 0) {
                        var headerName = rejectedHeader[0];
                        log.debug("REJECTED stub '" + stub.id + "' on header '" + headerName + "' [Expected: '" +
                            stub.criteria.headers[headerName] + "'; Actual: '" + request.headers[headerName] + "']");
                        return false;
                    }
                }

                return true;
            }

            function methodsMatch(request, stub) {
                if (stub.criteria.method && (request.method.toLowerCase() !== stub.criteria.method.toLowerCase())) {
                    log.debug("REJECTED stub '" + stub.id + "' on method [Expected: " + stub.criteria.method + "; Actual: " + request.method + "]");
                    return false;
                }

                return true;
            }

            function numberOfUsesMatch(stub) {
                if (!stub.expect && (stub.matched === stub.times)) {
                    log.debug("REJECTED stub '" + stub.id + "' on stub has already been matched " + stub.matched + " times.");
                    return false;
                }

                return true;
            }

            function wholeStringRegex(regexText) {
                var result = regexText;

                if (result.substr(0, 1) !== "^") {
                    result = "^" + result;
                }
                if (result.substr(result.length - 1, 1) !== "$") {
                    result = result + "$";
                }

                return result;
            }

            function urlsMatch(requestUrl, stub) {
                var stubUrl = wholeStringRegex(stub.criteria.url);

                if (!requestUrl.match(stubUrl)) {
                    log.debug("REJECTED stub '" + stub.id + "' on url [Expected: " + stubUrl + "; Actual: " + requestUrl + "]");
                    return false;
                }

                return true;
            }

            function safePriorityFor(stub) {
                return stub.priority || 0;
            }

            var requestPath = request.path(),
                requestUrl = ((requestPath.substr(0, 1) !== "/") ? "/" : "") + requestPath,
                match;

            log.debug("REQUEST: " + request.method + " " + requestUrl);

            var matchingStubs = registry.filter(function (stub) {
                return methodsMatch(request, stub) &&
                    urlsMatch(requestUrl, stub) &&
                    queriesMatch(request, stub) &&
                    headersMatch(request, stub) &&
                    bodiesMatch(request, stub) &&
                    numberOfUsesMatch(stub);
            });

            if (matchingStubs.length > 0) {
                match = matchingStubs.reduce(function (currentWinner, candidate) {
                    if (safePriorityFor(candidate) < safePriorityFor(currentWinner)) {
                        return candidate;
                    }
                    return currentWinner;
                });

                log.info("MATCHED request " + asString(request) + " against stub: " + JSON.stringify(match));

                match.matched++;

                if (match.capture) {
                    storeCapture(match.capture, request);
                }

                return match;
            }

            return null;
        };

        this.getCapture = function (captureId) {
            return captures[captureId];
        };

        this.clear();
    }

    return new StubRegistry(appLog);
};