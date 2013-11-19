var _ = require("lodash");

exports.create = function (appLog) {
    function StubRegistry(appLog) {
        var registry = [],
            log = appLog.child({ component: "StubRegistry" });

        this.add = function (stubDefinition) {
            if (!stubDefinition.criteria) {
                throw new Error("criteria must be specified.");
            }

            if (!stubDefinition.criteria.url) {
                throw new Error("url must be specified in the criteria.");
            }

            if (stubDefinition.criteria.entity && !stubDefinition.criteria.contentType) {
                throw new Error("the contentType for a criteria entity must be specified.");
            }

            if (!stubDefinition.respondWith) {
                throw new Error("respondWith must be specified.");
            }

            if (!stubDefinition.respondWith.status) {
                throw new Error("status must be specified in the respondWith.");
            }

            if (stubDefinition.respondWith.entity && !stubDefinition.respondWith.contentType) {
                throw new Error("the respondWith contentType for an entity must be specified.");
            }

            if (_.isString(stubDefinition.criteria.url) && (stubDefinition.criteria.url.substr(0, 1) === "/")) {
                stubDefinition.criteria.url = stubDefinition.criteria.url.slice(1);
            }

            registry.push(stubDefinition);
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

                if (stub.criteria.entity) {
                    if (_.isFunction(stub.criteria.entity)) {
                        if (!stub.criteria.entity(request.body)) {
                            log.debug("REJECTED on entity [Expected: entity matched by function; Actual: " + request.body + "]");
                            return false;
                        }

                    } else if (!JSON.stringify(request.body).match(stub.criteria.entity)) {
                        log.debug("REJECTED on entity [Expected: '" + stub.criteria.entity + "'; Actual: " + JSON.stringify(request.body) + "]");
                        return false;

                    } else if (stub.criteria.contentType !== request.contentType) {
                        log.debug("REJECTED on entity content type [Expected: '" + stub.criteria.contentType + "'; Actual: " + request.contentType + "]");
                        return false;
                    }
                }

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