const AppError = require('../utils/AppError');

module.exports = function sameOrigin(req, res, next) {
    // Browser forms and same-origin fetches send Origin on POST.
    const origin = new URL(process.env.APP_ORIGIN || `http://localhost:${process.env.PORT || 8080}`).origin;
    if (req.get('origin') !== origin) {
        return next(new AppError('Open the portal at its configured address and try again.', 403));
    }
    next();
};
