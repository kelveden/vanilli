exports.create = function (appLog) {
    function StubRegistry(appLog) {
        var registry = [],
            log = appLog.child({ component: "StubRegistry" });

        this.add = function (stubDefinition) {
            registry.push(stubDefinition);
        };

        this.findMatchFor = function (request) {
            log.debug("Finding match for request: " + request);

            var matchingStubs = registry.filter(function (stub) {
                if (!request.url.match(stub.criteria.url)) {
                    log.debug("REJECTED on url [Expected: " + stub.url + "; Actual: " + request.url + "]");
                    return false;
                }

                log.debug("MATCHED: " + stub);

                return true;
            });

            if (matchingStubs.length === 1) {
                return matchingStubs[0];
            } else {
                if (matchingStubs.length > 1) {
                    log.warn("More than one stub matched the request.");
                }

                return null;
            }
        };
    }

    return new StubRegistry(appLog);
};