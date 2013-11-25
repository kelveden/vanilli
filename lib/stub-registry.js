var _ = require("lodash"),
    uuid = require('node-uuid');

exports.create = function (appLog) {
    function StubRegistry(appLog) {

        var registry = [],
            log = appLog.child({ component: "StubRegistry" }),
            self = this;

        function refreshSize() {
            self.size = registry.length;
        }

        refreshSize();

        this.add = function (stubDefinition) {
            function assignContentTypeOn(object) {
                if (object.headers && object.headers["Content-Type"]) {
                    object.contentType = object.headers["Content-Type"];
                }
            }

            if (!stubDefinition.criteria) {
                throw new Error("criteria must be specified.");
            }

            if (!stubDefinition.criteria.url) {
                throw new Error("url must be specified in the criteria.");
            }

            if (stubDefinition.criteria.body && !stubDefinition.criteria.contentType) {
                throw new Error("the contentType for a criteria body must be specified.");
            }

            if (!stubDefinition.respondWith) {
                throw new Error("respondWith must be specified.");
            }

            if (!stubDefinition.respondWith.status) {
                throw new Error("status must be specified in the respondWith.");
            }

            if (stubDefinition.respondWith.body && !stubDefinition.respondWith.contentType) {
                throw new Error("the respondWith contentType for a body must be specified.");
            }

            if (_.isString(stubDefinition.criteria.url) && (stubDefinition.criteria.url.substr(0, 1) === "/")) {
                stubDefinition.criteria.url = stubDefinition.criteria.url.slice(1);
            }

            assignContentTypeOn(stubDefinition.criteria);
            assignContentTypeOn(stubDefinition.respondWith);

            stubDefinition.matched = 0;
            stubDefinition.id = uuid.v4();

            registry.push(stubDefinition);
            refreshSize();

            return stubDefinition;
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
            refreshSize();
        };

        this.findMatchFor = function (request) {
            log.debug("Finding match for request: " + request.url);

            var matchingStubs = registry.filter(function (stub) {
                if (!request.url.match(stub.criteria.url)) {
                    log.debug("REJECTED on url [Expected: " + stub.criteria.url + "; Actual: " + request.url + "]");
                    return false;
                }

                if (stub.criteria.method && (request.method.toLowerCase() !== stub.criteria.method.toLowerCase())) {
                    log.debug("REJECTED on method [Expected: " + stub.criteria.method + "; Actual: " + request.method + "]");
                    return false;
                }

                if (stub.criteria.headers) {
                    var rejectedHeader = _.keys(stub.criteria.headers).filter(function (headerName) {
                        var headerValue = request.headers[headerName.toLowerCase()];
                        return !headerValue || !headerValue.match(stub.criteria.headers[headerName]);
                    });

                    if (rejectedHeader.length > 0) {
                        var headerName = rejectedHeader[0];
                        log.debug("REJECTED on header '" + headerName + "' [Expected: '" +
                            stub.criteria.headers[headerName] + "'; Actual: '" + request.headers[headerName] + "']");
                        return false;
                    }
                }

                if (stub.criteria.body) {
                    if (_.isFunction(stub.criteria.body)) {
                        if (!stub.criteria.body(request.body)) {
                            log.debug("REJECTED on body [Expected: body matched by function; Actual: " + request.body + "]");
                            return false;
                        }

                    } else if (!JSON.stringify(request.body).match(stub.criteria.body)) {
                        log.debug("REJECTED on body [Expected: '" + stub.criteria.body + "'; Actual: " + JSON.stringify(request.body) + "]");
                        return false;

                    } else if (stub.criteria.contentType !== request.contentType()) {
                        log.debug("REJECTED on body content type [Expected: '" + stub.criteria.contentType + "'; Actual: " + request.contentType() + "]");
                        return false;
                    }
                }

                if (stub.matched === stub.times) {
                    log.debug("REJECTED on stub has already been matched " + stub.matched + " times.");
                    return false;
                }

                stub.matched++;

                log.debug("MATCHED: " + JSON.stringify(stub));

                return true;
            });

            if (matchingStubs.length === 1) {
                return matchingStubs[0];

            } else if (matchingStubs.length > 1) {
                throw new Error("More than one stub matched the request.");

            } else {
                return null;
            }
        };
    }

    return new StubRegistry(appLog);
};