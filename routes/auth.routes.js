const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const sameOrigin = require('../middleware/sameOrigin');
const { registerRules, loginRules } = require('../validators/auth.validator');

const limit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    message: { success: false, message: 'Too many attempts. Try again later.' },
});

function protectBrowserRegistration(req, res, next) {
    if (req.baseUrl === '/auth' && (req.get('origin') || req.is('application/x-www-form-urlencoded'))) {
        return sameOrigin(req, res, next);
    }
    next();
}

router.post('/register', protectBrowserRegistration, limit, registerRules, validate, ctrl.register);
router.post('/login', limit, loginRules, validate, ctrl.login);
router.get('/me', protect, ctrl.me);

module.exports = router;
