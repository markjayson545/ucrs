const router = require('express').Router();


router.use('/auth', require('./session.routes'));
router.use('/auth', require('./auth.routes'));

router.use('/', require('./views.routes'));

router.get('/api/health', (req, res) => {
    res.json({
        success: true, data: {
            status: 'ok', uptime: process.uptime(), timestamp: Date.now()
        }
    })
});

router.use('/courses', require('./course.routes'));

module.exports = router;
