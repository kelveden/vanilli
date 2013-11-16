exports.startServer = function (port) {
    var http = require('http'),
        log = require('bunyan').createLogger({ name: "vanilli" }),
        restify = require('restify'),
        restServer = restify.createServer();

    restServer.listen(port, function () {
        restServer.use(restify.queryParser({ mapParams: false }));
        restServer.use(restify.jsonp());

        restServer.get('ping', function (request, response, next) {
            response.send({ ping: "pong" });
            return next();
        });
    });

    log.info("Vanilli started on port " + port + ".");

    return restServer;
}

