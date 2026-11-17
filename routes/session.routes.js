const router = require("express").Router();
const User = require("../models/User");

const homeByRole = {
    student: '/student',
    faculty: '/faculty',
    admin: '/admin',
};

const expectedOrigin = new URL(process.env.APP_ORIGIN).origin;

function sameOrigin(req, res, next) {
    if (req.get('origin') !== expectedOrigin) {
        return res.status(403).json({
            message: 'Request origin is not allowed',
        });
    }
    next();
}

router.post('/session', sameOrigin, async (req, res, next) => {
    try {
        const {email, password} = req.body;

        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({
                message: 'Email and password are required',
            })
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase(),
        }).select('+password');

        if (
            !user || !user.isActive || !(await user.comparePassword(password))
        ) {
            return res.status(401).json({
                message: 'Invalid email or password'
            })
        }

        const redirectTo = homeByRole[user.role];

        if(!redirectTo) {
            return res.status(403).json({
                message: 'Account role is not supported'
            });
        }

        req.session.regenerate(error => {
            if (error) return next(error);

            req.session.userId = user._id.toString();

            req.session.save(error => {
                if(error) return next(error);
                res.json({redirectTo});
            })
        })

    } catch (error) {
        next(error);
    }
});

router.post('/logout', sameOrigin, (req, res, next) => {
    req.session.destroy(error => {
        if (error) return next(error);
        res.clearCookie('ucrs.sid', { path: '/'});
        res.redirect(303, '/auth/login');
    });
});

module.exports = router;