var _ = require('lodash');

exports.configure = function () {
    return function(req, res, next) {
        var allowedHeaders = req.headers['access-control-request-headers'] || req.headers['Access-Control-Request-Headers'],
            allowedMethods = req.headers['access-control-request-methods'] || req.headers['Access-Control-Request-Methods'];

        res.header('Access-Control-Allow-Origin', '*');

        if (allowedHeaders) {
            res.header('Access-Control-Allow-Headers', allowedHeaders);
        }

        if (allowedMethods) {
            res.header('Access-Control-Allow-Methods', allowedMethods);
        }

        return next();
    };
};
