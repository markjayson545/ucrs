const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { success } = require('../utils/response');

exports.register = asyncHandler(async (req, res) => {
    const { name, email, password, idNumber, department } = req.body;
    const user = await User.create({
        name, email, password, idNumber: idNumber || undefined, department, role: 'student'
    });
    if (req.baseUrl === '/auth' && req.is('application/x-www-form-urlencoded')) {
        return res.redirect(303, res.locals.registeredUrl || req.app.locals.registeredUrl);
    }
    success(res, { user, token: signToken(user)}, 201);
});

exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({email}).select('+password');

    if (!user || !user.isActive || !(await user.comparePassword(password))) {
        throw new AppError('Invalid email or password', 401);
    }
    success(res, { user, token: signToken(user) }, 200);
});

exports.me = asyncHandler(async (req, res) => {
    success(res, { user: req.user });
});
