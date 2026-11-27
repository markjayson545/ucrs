const courseService = require('../services/course.service');
const sectionService = require('../services/section.service');
const enrollmentService = require('../services/enrollment.service');
const transcriptService = require('../services/transcript.service');
const reportService = require('../services/report.service');
const userService = require('../services/user.service');
const imageService = require('../services/image.service');
const User = require('../models/User');
const Course = require('../models/Course');
const { sectionInput, meetingFromForm } = require('../validators/section.validator');
const { pointsByLetter } = require('../utils/gpa');
const AppError = require('../utils/AppError');

function saved(req, res, path, message) {
    req.session.notice = message;
    if (req.get('X-Portal-Form') === '1') return res.json({ redirectTo: path });
    res.redirect(303, path);
}

exports.courseImage = async (req, res) => {
    const image = await imageService.read(Course, req.params.id);
    res.set('Cache-Control', 'no-cache').type('image/webp').send(image);
};

exports.profilePhoto = async (req, res) => {
    const image = await imageService.read(User, req.user._id);
    res.set('Cache-Control', 'private, no-store').type('image/webp').send(image);
};

exports.catalog = async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const department = typeof req.query.department === 'string' ? req.query.department : '';
    const page = Math.max(1, Math.min(Number.parseInt(req.query.page, 10) || 1, 100000));
    const [{ items, meta }, departments] = await Promise.all([
        courseService.list({ q, department, page, limit: 12 }),
        courseService.departments(),
    ]);
    res.render('catalog/index', {
        title: 'Course catalog', courses: items, q, department, departments, meta,
        pageLink: number => '/catalog/courses?' + new URLSearchParams({ q, department, page: number }),
    });
};

exports.courseDetails = async (req, res) => {
    const [course, sections, registration] = await Promise.all([
        courseService.getById(req.params.id),
        sectionService.list({ course: req.params.id, term: res.locals.term, status: { $ne: 'cancelled' } }),
        req.user?.role === 'student' ? enrollmentService.getCourseRegistration(req.user._id, req.params.id) : null,
    ]);
    res.render('catalog/show', {
        title: course.title, course, sections,
        registration,
    });
};

exports.studentHome = async (req, res) => {
    const [enrollments, transcript, { items: courses }] = await Promise.all([
        enrollmentService.listForStudent(req.user._id),
        transcriptService.forStudent(req.user._id),
        courseService.list({ limit: 3 }),
    ]);
    const enrolled = enrollments.filter(record => record.status === 'enrolled');
    const meetings = enrollmentService.timetable(enrolled);
    res.render('student/index', {
        title: 'Student overview', courses, meetings,
        stats: [
            ['Active credits', enrolled.reduce((total, record) => total + (record.course?.credits || 0), 0), 'book'],
            ['Enrolled courses', enrolled.length, 'check'],
            ['Waitlisted courses', enrollments.length - enrolled.length, 'clock'],
            ['Cumulative GPA', transcript.gpa?.toFixed(2) ?? '—', 'chart'],
        ],
    });
};

exports.enrollments = async (req, res) => {
    const enrollments = await enrollmentService.listForStudent(req.user._id);
    res.render('student/enrollments', { title: 'My enrollments', enrollments });
};

exports.schedule = async (req, res) => {
    const enrollments = await enrollmentService.listForStudent(req.user._id);
    res.render('student/schedule', { title: 'Weekly schedule', enrollments, meetings: enrollmentService.timetable(enrollments) });
};

exports.transcript = async (req, res) => {
    const transcript = await transcriptService.forStudent(req.user._id);
    res.render('student/transcript', { title: 'Academic record', transcript });
};

exports.register = async (req, res) => {
    res.locals.returnTo = '/catalog/courses';
    const record = await enrollmentService.register(req.user._id, req.params.id);
    saved(req, res, '/student/enrollments', record.status === 'enrolled'
        ? 'You are enrolled. Your schedule has been updated.'
        : 'You joined the waitlist. Your seat is pending.');
};

exports.drop = async (req, res) => {
    res.locals.returnTo = '/student/enrollments';
    await enrollmentService.drop(req.user._id, req.params.id);
    saved(req, res, '/student/enrollments', 'The registration was dropped.');
};

exports.account = (req, res) => {
    res.render('account/index', { title: 'Account settings' });
};

exports.updateProfile = async (req, res) => {
    res.locals.returnTo = '/account';
    const image = await imageService.prepare(req.file, req.body.removeImage, 'profile');
    await userService.updateProfile(req.user._id, req.body, image);
    saved(req, res, '/account', 'Your profile was updated.');
};

exports.changePassword = async (req, res) => {
    res.locals.returnTo = '/account#security';
    const authVersion = await userService.changePassword(req.user._id, req.body);

    // Keep this browser signed in with a fresh session.
    await new Promise((resolve, reject) => {
        req.session.regenerate(error => error ? reject(error) : resolve());
    });
    req.session.userId = String(req.user._id);
    req.session.authVersion = authVersion;
    saved(req, res, '/account', 'Password updated. Other sessions and API tokens have been signed out.');
};

exports.facultyHome = async (req, res) => {
    const sections = await sectionService.list({ faculty: req.user._id, term: res.locals.term });
    res.render('faculty/index', { title: 'Faculty overview', sections });
};

exports.facultySections = async (req, res) => {
    const sections = await sectionService.list({ faculty: req.user._id });
    res.render('faculty/sections', { title: 'My teaching sections', sections });
};

exports.roster = async (req, res) => {
    const roster = await sectionService.roster(req.user._id, req.params.id);
    res.render('faculty/roster', { title: 'Class roster', ...roster });
};

exports.gradebook = async (req, res) => {
    const roster = await sectionService.roster(req.user._id, req.params.id);
    res.render('faculty/grades', { title: 'Gradebook', letters: Object.keys(pointsByLetter), ...roster });
};

exports.submitGrades = async (req, res) => {
    res.locals.returnTo = '/faculty/sections/' + req.params.id + '/grades';
    const { updated } = await transcriptService.submitGrades(req.user._id, req.params.id, req.body.grade);
    saved(req, res, '/faculty/sections/' + req.params.id + '/grades', `Grades saved for ${updated} student(s).`);
};

exports.adminHome = async (req, res) => {
    const [{ meta }, report] = await Promise.all([courseService.list({ limit: 1 }), reportService.summary()]);
    res.render('admin/index', { title: 'Administration overview', courseCount: meta.total, report });
};

exports.adminCourses = async (req, res) => {
    res.render('admin/courses', { title: 'Course management', courses: await courseService.all() });
};

exports.courseForm = async (req, res) => {
    const editing = Boolean(req.params.id);
    const [course, courses] = await Promise.all([
        editing ? courseService.getById(req.params.id) : null,
        courseService.all(),
    ]);
    res.render('admin/course-form', { title: editing ? 'Edit course' : 'Create a course', course, courses });
};

exports.createCourse = async (req, res) => {
    res.locals.returnTo = '/admin/courses/new';
    const image = await imageService.prepare(req.file, req.body.removeImage, 'course');
    await courseService.create(req.body, image);
    saved(req, res, '/admin/courses', 'Course created.');
};

exports.updateCourse = async (req, res) => {
    res.locals.returnTo = '/admin/courses/' + req.params.id + '/edit';
    const image = await imageService.prepare(req.file, req.body.removeImage, 'course');
    await courseService.update(req.params.id, req.body, image);
    saved(req, res, '/admin/courses', 'Course updated.');
};

exports.deleteCourse = async (req, res) => {
    res.locals.returnTo = '/admin/courses';
    await courseService.remove(req.params.id);
    saved(req, res, '/admin/courses', 'Course deleted.');
};

exports.adminSections = async (req, res) => {
    res.render('admin/sections', { title: 'Section management', sections: await sectionService.list() });
};

exports.sectionForm = async (req, res) => {
    const editing = Boolean(req.params.id);
    const [section, courses, faculty] = await Promise.all([
        editing ? sectionService.getById(req.params.id) : null,
        courseService.all(),
        userService.faculty(),
    ]);
    if (section?.faculty && !faculty.some(user => user._id.equals(section.faculty._id))) faculty.push(section.faculty);
    res.render('admin/section-form', {
        title: editing ? 'Edit section' : 'Create a section', section, courses, faculty,
    });
};

exports.saveSection = async (req, res) => {
    const id = req.params.id;
    res.locals.returnTo = id ? '/admin/sections/' + id + '/edit' : '/admin/sections/new';
    const data = sectionInput({
        ...req.body,
        schedule: Object.values(req.body.meetings || {}).map(meetingFromForm),
    }, { editing: Boolean(id) });
    if (id) await sectionService.update(id, data);
    else await sectionService.create(data);
    saved(req, res, '/admin/sections', id ? 'Section updated.' : 'Section created.');
};

exports.deleteSection = async (req, res) => {
    res.locals.returnTo = '/admin/sections';
    await sectionService.remove(req.params.id);
    saved(req, res, '/admin/sections', 'Section deleted.');
};

exports.users = async (req, res) => {
    res.render('admin/users', { title: 'People and access', people: await userService.list() });
};

exports.updateAccess = async (req, res) => {
    res.locals.returnTo = '/admin/users';
    const { role, isActive } = req.body;
    if (!['student', 'faculty'].includes(role) || !['true', 'false'].includes(isActive)) {
        throw new AppError('Select a valid role and account status.', 400);
    }
    await userService.updateAccess(req.params.id, { role, isActive: isActive === 'true' });
    saved(req, res, '/admin/users', 'Account access updated.');
};

exports.reports = async (req, res) => {
    res.render('admin/reports', { title: 'Enrollment reports', report: await reportService.summary() });
};
