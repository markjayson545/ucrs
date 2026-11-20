const router = require('express').Router();
const demo = require('../fixtures/view-demo');
const { timetable } = require('../services/enrollment.service');
const { pointsByLetter, calculateGpa } = require('../utils/gpa');
const { days, formatTime } = require('../utils/time');

const report = {
    sections: demo.sections.map(section => ({ ...section, waitlisted: section._id === 'section-2' ? 1 : 0 })),
    capacity: 140, enrolled: 117, available: 23, waitlisted: 1, utilization: 84, openSections: 4,
};

const previewUsers = {
    student: demo.user,
    faculty: { name: 'Elena Reyes', email: 'elena.reyes@example.edu', department: 'Computer Science', idNumber: 'FAC-101' },
    admin: { name: 'Morgan Santos', email: 'morgan.santos@example.edu', department: 'Registrar' },
};

router.use((req, res, next) => {
    const accountRole = req.path === '/account' && typeof req.query.role === 'string' && Object.hasOwn(previewUsers, req.query.role)
        ? req.query.role : 'student';
    const role = req.path.match(/^\/(student|faculty|admin)(?:\/|$)/)?.[1] || accountRole;
    Object.assign(res.locals, demo, { role, user: previewUsers[role], currentPath: req.path, days, formatTime, notice: null });
    next();
});

const page = (view, title, data) => (req, res) => res.render(view, { title, ...data });
const missing = (req, res) => res.status(404).render('shared/notFound', { title: 'Page not found' });

router.get('/', page('index', 'University Course Registration'));
router.get('/auth/login', page('auth/login', 'Sign in'));
router.get('/auth/register', page('auth/register', 'Create your account'));

router.get('/catalog/courses', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const department = typeof req.query.department === 'string' ? req.query.department : '';
    const courses = demo.courses.filter(course =>
        (!department || department === course.department) &&
        (course.code + ' ' + course.title).toLowerCase().includes(q.toLowerCase())
    );
    res.render('catalog/index', {
        title: 'Course catalog', courses, q, department,
        departments: [...new Set(demo.courses.map(course => course.department))].sort(),
        meta: { total: courses.length, page: 1, pages: 1 },
    });
});
router.get('/catalog/courses/:id', (req, res) => {
    const course = demo.courses.find(course => course._id === req.params.id);
    if (!course) return missing(req, res);
    res.render('catalog/show', {
        title: course.title, course,
        sections: demo.sections.filter(section => section.course._id === course._id),
        registration: null,
    });
});

router.get('/student', page('student/index', 'Student overview', {
    courses: demo.courses.slice(0, 3),
    stats: [['Active credits', 9, 'book'], ['Enrolled courses', 3, 'check'], ['Waitlisted courses', 1, 'clock'], ['Cumulative GPA', '3.75', 'chart']],
    meetings: timetable(demo.enrollments.filter(record => record.status === 'enrolled')),
}));
router.get('/student/enrollments', page('student/enrollments', 'My enrollments'));
router.get('/student/schedule', page('student/schedule', 'Weekly schedule', { meetings: timetable(demo.enrollments) }));
router.get('/student/transcript', page('student/transcript', 'Academic record', {
    transcript: {
        records: demo.transcript.map(record => ({ ...record, term: '2025-2' })),
        gpa: calculateGpa(demo.transcript), credits: 12,
    },
}));
router.get(['/account', '/student/profile'], page('account/index', 'Account settings'));

router.get('/faculty', page('faculty/index', 'Faculty overview'));
router.get('/faculty/sections', page('faculty/sections', 'My teaching sections'));
for (const view of ['roster', 'grades']) {
    router.get('/faculty/sections/:id/' + view, (req, res) => {
        const section = demo.sections.find(section => section._id === req.params.id);
        if (!section) return missing(req, res);
        res.render('faculty/' + view, {
            title: view === 'roster' ? 'Class roster' : 'Gradebook',
            section, letters: Object.keys(pointsByLetter),
            records: demo.students.map(student => ({ _id: student._id, student, status: 'enrolled' })),
        });
    });
}

router.get('/admin', page('admin/index', 'Administration overview', { courseCount: demo.courses.length, report }));
router.get('/admin/courses', page('admin/courses', 'Course management'));
router.get('/admin/courses/new', page('admin/course-form', 'Create a course', { course: null }));
router.get('/admin/courses/:id/edit', (req, res) => {
    const course = demo.courses.find(course => course._id === req.params.id);
    if (!course) return missing(req, res);
    res.render('admin/course-form', { title: 'Edit course', course });
});
const faculty = demo.sections.map((section, index) => ({ _id: 'faculty-' + (index + 1), name: section.faculty.name }));
router.get('/admin/sections', page('admin/sections', 'Section management'));
router.get('/admin/sections/new', page('admin/section-form', 'Create a section', { section: null, faculty }));
router.get('/admin/sections/:id/edit', (req, res) => {
    const index = demo.sections.findIndex(section => section._id === req.params.id);
    if (index === -1) return missing(req, res);
    const section = { ...demo.sections[index], faculty: faculty[index] };
    res.render('admin/section-form', { title: 'Edit section', section, faculty });
});
router.get('/admin/users', page('admin/users', 'People and access', { people: demo.students }));
router.get('/admin/reports', page('admin/reports', 'Enrollment reports', { report }));
router.get('/preview/forbidden', (req, res) =>
    res.status(403).render('shared/notAuthorized', { title: 'Access restricted' }));
router.use(missing);

module.exports = router;
