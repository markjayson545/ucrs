const { body } = require('express-validator');

exports.profileRules = [
    body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Enter a name of up to 100 characters.'),
    body('email').isString().trim().isEmail().withMessage('Enter a valid email address.').toLowerCase(),
    body('department').isString().trim().isLength({ max: 100 }).withMessage('Enter a department of up to 100 characters.'),
    body('currentPassword').optional().isString().withMessage('Enter your current password.'),
];

exports.passwordRules = [
    body('currentPassword').isString().notEmpty().withMessage('Enter your current password.'),
    body('newPassword').isString().bail()
        .isLength({ min: 8 }).withMessage('Use at least 8 characters.').bail()
        .custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Use a password of 72 bytes or fewer.').bail()
        .custom((value, { req }) => value !== req.body.currentPassword).withMessage('Choose a password different from your current password.'),
    body('confirmPassword').isString().bail()
        .custom((value, { req }) => value === req.body.newPassword).withMessage('The new passwords must match.'),
];
