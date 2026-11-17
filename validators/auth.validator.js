const { body } = require('express-validator');

exports.registerRules = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required').toLowerCase(),
    body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
];

exports.loginRules = [
    body('email').trim().isEmail().withMessage('Valid email is required').toLowerCase(),
    body('password').isString().notEmpty().withMessage('Password is required')
];