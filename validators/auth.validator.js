const { body } = require('express-validator');

const email = body('email').isString().trim().isEmail()
    .withMessage('Valid email is required').toLowerCase();

exports.registerRules = [
    body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Enter a name of up to 100 characters.'),
    email,
    body('password').isString().bail().isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .bail().custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Use a password of 72 bytes or fewer.'),
    body('confirmPassword')
        .if((value, { req }) => value !== undefined || (req.baseUrl === '/auth' &&
            (req.is('application/x-www-form-urlencoded') || req.get('X-Portal-Form') === '1')))
        .custom(value => typeof value === 'string' && value.length > 0).withMessage('Confirm your password.').bail()
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords don’t match. Enter the same password in both fields.'),
    body('idNumber').optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }),
    body('department').optional().isString().trim().isLength({ max: 100 }),
];

exports.loginRules = [
    email,
    body('password').isString().notEmpty().withMessage('Password is required'),
];
