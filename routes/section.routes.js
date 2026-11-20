const router = require('express').Router();
const ctrl = require('../controllers/section.controller');
const { protect, authorizeRoles } = require('../middleware/auth');
const { idParam } = require('../validators/course.validator');
const validate = require('../middleware/validate');

router.use(protect);
router.get('/', ctrl.list);
router.get('/:id', idParam, validate, ctrl.getOne);
router.get('/:id/roster', authorizeRoles('faculty'), idParam, validate, ctrl.roster);
router.patch('/:id/grades', authorizeRoles('faculty'), idParam, validate, ctrl.grades);
router.post('/', authorizeRoles('admin'), ctrl.create);
router.patch('/:id', authorizeRoles('admin'), idParam, validate, ctrl.update);
router.delete('/:id', authorizeRoles('admin'), idParam, validate, ctrl.remove);

module.exports = router;
