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
].join(', ');

exports.configure = function () {
    return function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', ALLOW_HEADERS);
        if (res.methods && res.methods.length > 0) {
            res.header('Access-Control-Allow-Methods', res.methods.join(', '));
        }

        return next();
    };
};
