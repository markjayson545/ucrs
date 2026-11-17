const router = require('express').Router();
const ctrl = require('../controllers/course.controller');
const { protect, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { idParam, createRules, updateRules, listRules } = require('../validators/course.validator');

router.use(protect);   // every route below requires a valid token

router.get('/', listRules, validate, ctrl.list);
router.get('/:id', idParam, validate, ctrl.getOne);

router.post('/', authorizeRoles('admin'), createRules, validate, ctrl.create);
router.patch('/:id', authorizeRoles('admin'), idParam, updateRules, validate, ctrl.update);
router.delete('/:id', authorizeRoles('admin'), idParam, validate, ctrl.remove);

module.exports = router;