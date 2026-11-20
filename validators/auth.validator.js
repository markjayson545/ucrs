const { body } = require('express-validator');

const email = body('email').isString().trim().isEmail()
    .withMessage('Valid email is required').toLowerCase();

exports.registerRules = [
    body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Enter a name of up to 100 characters.'),
    email,
    body('password').isString().bail().isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .bail().custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Use a password of 72 bytes or fewer.'),
    body('idNumber').optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }),
    body('department').optional().isString().trim().isLength({ max: 100 }),
];

exports.loginRules = [
    email,
    body('password').isString().notEmpty().withMessage('Password is required'),
];
