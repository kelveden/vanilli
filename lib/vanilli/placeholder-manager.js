var _ = require('lodash');

exports.substitute = function (request, responseBody) {

    if (!responseBody) {
        return responseBody;
    }

    function doReplacement(text) {
        return text.replace(/@vanilli:([^@]+)?@/g, function (match, placeholder) {
            return request.query[placeholder];
        });
    }

    if (_.isObject(responseBody)) {
        return JSON.parse(
            doReplacement(
                JSON.stringify(responseBody)));
    } else {
        return doReplacement(responseBody);
    }
};
