var _ = require('lodash');

var ALLOW_HEADERS = [
    'Accept',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Content-Type',
    'Date',
    'Api-Version',
    'Response-Time',
    'X-Requested-With'
];

exports.configure = function (options) {
    return function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');

        var allowedHeaders = _.union(ALLOW_HEADERS, options.allowedHeadersForCors).join(', ');
        res.header('Access-Control-Allow-Headers', allowedHeaders);

        if (res.methods && res.methods.length > 0) {
            res.header('Access-Control-Allow-Methods', res.methods.join(', '));
        }

        return next();
    };
};
