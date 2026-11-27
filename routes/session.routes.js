const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const sameOrigin = require('../middleware/sameOrigin');
const validate = require('../middleware/validate');
const { loginRules } = require('../validators/auth.validator');

const limitSignIn = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    handler: (req, res, next) => next(new AppError('Too many sign-in attempts. Try again later.', 429)),
});

router.post('/session', sameOrigin, limitSignIn, loginRules, validate, asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.isActive || !(await user.comparePassword(password))) {
        throw new AppError('Invalid email or password', 401);
    }
    const redirectTo = res.locals.courseDestination || '/' + user.role;

    req.session.regenerate(error => {
        if (error) return next(error);
        req.session.userId = String(user._id);
        req.session.authVersion = user.authVersion;
        req.session.notice = 'You’re signed in.';
        req.session.save(error => {
            if (error) return next(error);
            if (req.is('application/json')) return res.json({ redirectTo });
            res.redirect(303, redirectTo);
        });
    });
}), (error, req, res, next) => {
    if (!req.is('application/x-www-form-urlencoded') || ![400, 401, 429].includes(error.statusCode)) {
        return next(error);
    }
    res.set('Cache-Control', 'no-store').status(error.statusCode).render('auth/login', {
        title: 'Sign in',
        loginEmail: typeof req.body.email === 'string' ? req.body.email : '',
        loginError: error.errors?.map(field => field.message).join(' ') || error.message,
    });
});

router.post('/logout', sameOrigin, (req, res, next) => {
    req.session.destroy(error => {
        if (error) return next(error);
        res.clearCookie('ucrs.sid', { path: '/' });
        res.redirect(303, '/auth/login?signedOut=1');
    });
});

module.exports = router;
