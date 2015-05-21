var _ = require("lodash"),
    uuid = require('node-uuid');

exports.create = function (config) {
    function StubRegistry(appLog) {

        var registry = [],
            captures = {},
            log = appLog;

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

            if (!stub.response) {
                throw new Error("response must be specified.");
            }

            if (!stub.response.status) {
                throw new Error("status must be specified in the response.");
            }

            if (stub.response.body && !stub.response.contentType) {
                throw new Error("the response contentType for a body must be specified.");
            }

            if (_.isString(stub.criteria.url) && (stub.criteria.url.substr(0, 1) !== "/")) {
                stub.criteria.url = "/" + stub.criteria.url;
            }
        }

        function initialiseStub(stub) {
            function unescapeStub (stub) {
                if (stub.criteria.url.regex) {
                    stub.criteria.url.regex = decodeURIComponent(stub.criteria.url.regex);
                } else {
                    stub.criteria.url = decodeURIComponent(stub.criteria.url);
                }

                if (stub.criteria.query) {
                    _.keys(stub.criteria.query).forEach(function (queryParam) {
                        var queryCriteria = stub.criteria.query[queryParam];

                        if (queryCriteria.regex) {
                            stub.criteria.query[queryParam].regex = decodeURIComponent(queryCriteria.regex);
                        } else {
                            stub.criteria.query[queryParam] = decodeURIComponent(queryCriteria);
                        }
                    });
                }
            }

            unescapeStub(stub);

            stub.matched = 0;
            stub.id = uuid.v4();
        }

        function asString(request) {
            return request.method + " " + request.url;
        }

        function unbuffer(object) {
            if (Buffer.isBuffer(object)) {
                return object.toString();
            } else {
                return object;
            }
        }

        function storeCapture(captureId, request) {
            log.info("CAPTURED request as capture with id '" + captureId + "'.");

            if (!captures[captureId]) {
                captures[captureId] = [];
            }

            captures[captureId].push({
                body: unbuffer(request.body),
                headers: request.headers,
                query: request.query,
                contentType: request.contentType()
            });
        }

        this.addStub = function (stub) {
            validateForRegistry(stub);
            initialiseStub(stub);

            log.debug(stub, "Stored stub:");

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
                        errors.push(message);
                    }
                });

            return errors;
        };

        this.findMatchFor = function (request) {
            function objectAsString (thing) {
                return (typeof thing === 'object') ? JSON.stringify(thing) : thing;
            }

            function bufferAsString(thing) {
                return (thing instanceof Buffer) ? thing.toString() : thing;
            }

            function criteriaMatchesPrimitive (criteria, value) {
                return (typeof value !== 'undefined') &&
                        (criteria.regex && value.match(criteria.regex)) ||
                        (!criteria.regex && (value === criteria));
            }

            function bodiesMatch (request, stub) {
                if (stub.criteria.body) {
                    if (!request.body) {
                        log.debug("REJECTED stub '" + stub.id + "' on body [Expected: '" + stub.criteria.body + "'; Actual: " + request.body + "]");
                        return false;

                    } else if (objectAsString(stub.criteria.body) !== objectAsString(bufferAsString(request.body))) {
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
                            return !criteriaMatchesPrimitive(stub.criteria.query[paramName], requestQuery[paramName]);
                        });

                    if (rejectedParam.length > 0) {
                        var paramName = rejectedParam[0];
                        log.debug("REJECTED stub '" + stub.id + "' on query param '" + paramName + "' [Expected: '" +
                            objectAsString(stub.criteria.query[paramName]) + "'; Actual: '" + requestQuery[paramName] + "']");
                        return false;
                    }
                }

                return true;
            }

            function headersMatch (request, stub) {
                if (stub.criteria.headers) {

                    var rejectedHeader = _.keys(stub.criteria.headers).filter(function (headerName) {
                        return !criteriaMatchesPrimitive(
                            stub.criteria.headers[headerName],
                            request.headers[headerName.toLowerCase()]);
                    });

                    if (rejectedHeader.length > 0) {
                        var headerName = rejectedHeader[0];
                        log.debug("REJECTED stub '" + stub.id + "' on header '" + headerName + "' [Expected: '" +
                            objectAsString(stub.criteria.headers[headerName]) + "'; Actual: '" + request.headers[headerName] + "']");
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

            function urlsMatch(requestUrl, stub) {
                if (!criteriaMatchesPrimitive(stub.criteria.url, requestUrl)) {
                    log.debug("REJECTED stub '" + stub.id + "' on url [Expected: " + objectAsString(stub.criteria.url) + "; Actual: " + requestUrl + "]");
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
                match = matchingStubs.reverse().reduce(function (currentWinner, candidate) {
                    if (safePriorityFor(candidate) < safePriorityFor(currentWinner)) {
                        return candidate;
                    }
                    return currentWinner;
                });

                log.info(match, "MATCHED request " + asString(request) + " against stub:");

                match.matched++;

                if (match.captureId) {
                    storeCapture(match.captureId, request);
                }

                return match;
            }

            return null;
        };

        this.getCapture = function (captureId) {
            return _.last(this.getCaptures(captureId));
        };

        this.getCaptures = function (captureId) {
            return captures[captureId];
        };

        this.clear();
    }

    return new StubRegistry(config.log);
};
