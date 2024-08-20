exports = function csrf(options) {
    var options = options || {}
        , value = options.value || defaultValue;

    return function (req, res, next) {
        // generate CSRF token
        var token = req.session._csrf || (req.session._csrf = utils.uid(24));

        // ignore GET (for now)
        if ('GET' == req.method) return next();

        // determine value
        var val = value(req);

        // check
        if (val != token) return utils.forbidden(res);

        next();
    }
}; 