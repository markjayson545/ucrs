const router = require('express').Router();

router.get('/api/health', (req, res) => {
    res.json({ success: true, data: { status: 'ok', uptime: process.uptime(), timestamp: Date.now() } });
});

router.use('/auth', require('./session.routes'));
router.use(['/auth', '/api/auth'], require('./auth.routes'));
router.use(['/courses', '/api/courses'], require('./course.routes'));
router.use('/api/sections', require('./section.routes'));
router.use('/api/enrollments', require('./enrollment.routes'));
router.use('/api/reports', require('./report.routes'));
router.use('/', require('./views.routes'));

module.exports = router;
