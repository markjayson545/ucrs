const router = require('express').Router();
const ctrl = require('../controllers/report.controller');
const { protect, authorizeRoles } = require('../middleware/auth');
const { query } = require('express-validator');
const validate = require('../middleware/validate');

router.get('/', protect, authorizeRoles('admin'), query('term').optional().isString().matches(/^\d{4}-[1-9]\d?$/), validate, ctrl.summary);

module.exports = router;
