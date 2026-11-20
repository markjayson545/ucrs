const router = require('express').Router();
const ctrl = require('../controllers/enrollment.controller');
const { protect, authorizeRoles } = require('../middleware/auth');
const { idParam } = require('../validators/course.validator');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.use(protect, authorizeRoles('student'));
router.get('/', ctrl.list);
router.get('/schedule', ctrl.schedule);
router.get('/transcript', ctrl.transcript);
router.post('/', body('section').isMongoId().withMessage('A valid section ID is required.'), validate, ctrl.register);
router.delete('/:id', idParam, validate, ctrl.drop);

module.exports = router;
