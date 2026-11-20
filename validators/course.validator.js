const {body, param, query} = require('express-validator');

exports.idParam = [
    param('id').isMongoId().withMessage('Invalid ID format')
];

exports.createRules = [
    body('code').trim().notEmpty().withMessage('Enter a course code.'),
    body('title').trim().notEmpty().withMessage('Enter a course title.'),
    body('department').trim().notEmpty().withMessage('Enter a department.'),
    body('credits').isInt({min: 1, max: 6}).withMessage('Enter a whole number of credits from 1 to 6.').toInt(),
    body('prerequisites').optional().isArray().withMessage('prerequisites must be an array'),
    body('prerequisites.*').isMongoId().withMessage('each prerequisite must be a valid course ID')
];

exports.updateRules = [
    body('title').optional().trim().notEmpty().withMessage('Enter a course title.'),
    body('department').optional().trim().notEmpty().withMessage('Enter a department.'),
    body('credits').optional().isInt({min: 1, max: 6}).withMessage('Enter a whole number of credits from 1 to 6.'),
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
