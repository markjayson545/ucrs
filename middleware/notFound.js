const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {

    next(new AppError(`Route Not Found: ${req.method} ${req.originalUrl}`, 404));
};