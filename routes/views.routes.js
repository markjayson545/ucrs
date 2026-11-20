const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const portal = require('../controllers/portal.controller');
const { loadPageUser, requirePageUser, allowPageRoles } = require('../middleware/view-auth');
const sameOrigin = require('../middleware/sameOrigin');
const validate = require('../middleware/validate');
const { idParam, createRules, updateRules } = require('../validators/course.validator');
const { profileRules, passwordRules } = require('../validators/account.validator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { currentTerm } = require('../config/academic');
const { days, formatTime } = require('../utils/time');

const limitAccountChanges = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    handler: (req, res, next) => next(new AppError('Too many account changes. Try again later.', 429)),
});

router.use((req, res, next) => {
    if (/^\/api(\/|$)/.test(req.path)) return next();
    Object.assign(res.locals, {
        pageRequest: true,
        currentPath: req.path,
        user: null,
        role: 'guest',
        term: currentTerm,
        termLabel: 'Term ' + currentTerm,
        days,
        formatTime,
        notice: req.session.notice,
    });
    if (req.method === 'GET' && req.session.notice) delete req.session.notice;
    loadPageUser(req, res, next);
});

router.use('/student', requirePageUser, allowPageRoles('student'));
router.use('/faculty', requirePageUser, allowPageRoles('faculty'));
router.use('/admin', requirePageUser, allowPageRoles('admin'));
router.use('/account', requirePageUser);
router.use(['/student', '/faculty', '/admin', '/account'], (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.method === 'POST') return sameOrigin(req, res, next);
    next();
});

router.get('/', (req, res) => res.render('index', { title: 'University Course Registration' }));
router.get('/auth/login', (req, res) => res.render('auth/login', {
    title: 'Sign in',
    registrationComplete: req.query.registered === '1',
}));
router.get('/auth/register', (req, res) => res.render('auth/register', { title: 'Create your account' }));
router.get('/catalog/courses', asyncHandler(portal.catalog));
router.get('/catalog/courses/:id', idParam, validate, asyncHandler(portal.courseDetails));
router.get('/account', portal.account);
router.post('/account/profile', limitAccountChanges, profileRules, validate, asyncHandler(portal.updateProfile));
router.post('/account/password', limitAccountChanges, passwordRules, validate, asyncHandler(portal.changePassword));

router.get('/student', asyncHandler(portal.studentHome));
router.get('/student/enrollments', asyncHandler(portal.enrollments));
router.get('/student/schedule', asyncHandler(portal.schedule));
router.get('/student/transcript', asyncHandler(portal.transcript));
router.get('/student/profile', portal.account);
router.post('/student/enrollments/:id/register', idParam, validate, asyncHandler(portal.register));
router.post('/student/enrollments/:id/drop', idParam, validate, asyncHandler(portal.drop));
router.post('/student/profile', limitAccountChanges, profileRules, validate, asyncHandler(portal.updateProfile));

router.get('/faculty', asyncHandler(portal.facultyHome));
router.get('/faculty/sections', asyncHandler(portal.facultySections));
router.get('/faculty/sections/:id/roster', idParam, validate, asyncHandler(portal.roster));
router.get('/faculty/sections/:id/grades', idParam, validate, asyncHandler(portal.gradebook));
router.post('/faculty/sections/:id/grades', idParam, validate, asyncHandler(portal.submitGrades));

router.get('/admin', asyncHandler(portal.adminHome));
router.get('/admin/courses', asyncHandler(portal.adminCourses));
router.get('/admin/courses/new', asyncHandler(portal.courseForm));
router.get('/admin/courses/:id/edit', idParam, validate, asyncHandler(portal.courseForm));
router.post('/admin/courses', courseCheckboxes, createRules, validate, asyncHandler(portal.createCourse));
router.post('/admin/courses/:id/edit', idParam, courseCheckboxes, updateRules, validate, asyncHandler(portal.updateCourse));
router.post('/admin/courses/:id/delete', idParam, validate, asyncHandler(portal.deleteCourse));
router.get('/admin/sections', asyncHandler(portal.adminSections));
router.get('/admin/sections/new', asyncHandler(portal.sectionForm));
router.get('/admin/sections/:id/edit', idParam, validate, asyncHandler(portal.sectionForm));
router.post('/admin/sections', asyncHandler(portal.saveSection));
router.post('/admin/sections/:id/edit', idParam, validate, asyncHandler(portal.saveSection));
router.post('/admin/sections/:id/delete', idParam, validate, asyncHandler(portal.deleteSection));
router.get('/admin/users', asyncHandler(portal.users));
router.post('/admin/users/:id/access', idParam, validate, asyncHandler(portal.updateAccess));
router.get('/admin/reports', asyncHandler(portal.reports));

function courseCheckboxes(req, res, next) {
    // Browsers send nothing for zero selections and a string for one selection.
    const prerequisites = req.body.prerequisites;
    if (prerequisites === undefined) req.body.prerequisites = [];
    else if (typeof prerequisites === 'string') req.body.prerequisites = [prerequisites];
    next();
}

router.use((req, res, next) => {
    if (!res.locals.pageRequest) return next();
    next(new AppError('This page could not be found.', 404));
});

module.exports = router;
