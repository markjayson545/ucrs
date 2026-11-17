const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

exports.protect = asyncHandler(async (req, res, next) => {
   const [scheme, token] = (req.headers.authorization || '').split(' ');
   if (scheme !== 'Bearer' || !token) throw new AppError('Authorization required', 401);

   const payload = jwt.verify(token, process.env.JWT_SECRET);
   const user = await User.findById(payload.id);
   if (!user || !user.active) throw new AppError('User not found or inactive', 401);

   req.user = user;
   next();
});

exports.authorizeRoles = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
}