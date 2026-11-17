const {body, param, query} = require('express-validator');

exports.idParam = [
    param('id').isMongoId().withMessage('Invalid ID format')
];

exports.createRules = [
    body('code').trim().notEmpty().withMessage('course code is required'),
    body('title').trim().notEmpty().withMessage('course title is required'),
    body('department').trim().notEmpty().withMessage('department is required'),
    body('credits').isInt({min: 1, max: 6}).withMessage('credits must be between 1 and 6').toInt(),
    body('prerequisites').optional().isArray().withMessage('prerequisites must be an array'),
    body('prerequisites.*').isMongoId().withMessage('each prerequisite must be a valid course ID')
];

exports.updateRules = [
    body('title').optional().trim().notEmpty(),
    body('department').optional().trim().notEmpty(),
    body('credits').optional().isInt({min: 1, max: 6}),
    body('prerequisites').optional().isArray(),
    body('prerequisites.*').optional().isMongoId().withMessage('Invalid prerequisite course ID')
];

exports.listRules = [
    query('page').optional().isInt({min: 1}).toInt(),
    query('limit').optional().isInt({min: 1, max: 100}).toInt(),
    query('q').optional().isString(),
    query('department').optional().isString(),
    query('sort').optional().isString(),
];