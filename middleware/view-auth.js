const User = require('../models/User');

exports.loadPageUser = async (req, res, next) => {
    try {
        req.user = null;
        res.locals.user = null;

        if(req.session?.userId){
            const user = await User.findById(req.session.userId)
            .select('name email role idNumber department isActive')
            .lean();

            if (user?.isActive) {
                req.user = user;
                res.locals.user = user;
                res.locals.role = user.role;
            }
        }
        next();
    }catch(e)  {
        next(e);
    }
};

exports.requirePageUser = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/auth/login');
    }
    next();
};

exports.allowPageRoles = (...roles) => (req, res, next) => {
    if (!req.user) {
        return res.redirect('/auth/login');
    }
    if (!roles.includes(req.user.role)) {
        return res.status(403).render('shared/notAuthorized', {
            title: 'Access restricted'
        });
    }
    next();
}