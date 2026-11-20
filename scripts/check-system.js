// Run against a replica set using a fresh, disposable database for each run.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');

const uri = process.env.UCRS_TEST_MONGO_URI;
if (!uri) throw new Error('Set UCRS_TEST_MONGO_URI to a MongoDB replica-set connection string.');

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = uri;
process.env.SESSION_SECRET = 'integration-session-secret';
process.env.JWT_SECRET = 'integration-token-secret';
process.env.CURRENT_TERM = '2026-1';

const mongoose = require('mongoose');
const createApp = require('../app');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');

const password = 'CheckCredentials123!';

async function run() {
    let server;
    try {
        await mongoose.connect(uri, { dbName: 'ucrs_test_' + randomUUID(), serverSelectionTimeoutMS: 5000 });
        await Promise.all(Object.values(mongoose.models).map(model => model.init()));
        server = createApp().listen(0, '127.0.0.1');
        await once(server, 'listening');
        const base = 'http://127.0.0.1:' + server.address().port;
        process.env.APP_ORIGIN = base;

        async function request(path, { method = 'GET', token, cookie, data, form, status = 200, origin = base, browserForm = false } = {}) {
            const headers = { Origin: origin };
            if (token) headers.Authorization = 'Bearer ' + token;
            if (cookie) headers.Cookie = cookie;
            if (data) headers['Content-Type'] = 'application/json';
            if (browserForm) headers['X-Portal-Form'] = '1';
            const body = form ? new URLSearchParams(form) : data && JSON.stringify(data);
            const response = await fetch(base + path, { method, headers, body, redirect: 'manual' });
            if (response.status !== status) {
                assert.fail(method + ' ' + path + ' expected ' + status + ', got ' + response.status + ' ' + (await response.text()).slice(0, 280));
            }
            return response;
        }

        const account = async (name, role = 'student') => {
            const email = name + '@example.edu';
            if (role === 'student') {
                await request('/api/auth/register', { method: 'POST', data: { name, email, password, role: 'admin' }, status: 201 });
            } else {
                await User.create({ name, email, password, role });
            }
            const api = await request('/api/auth/login', { method: 'POST', data: { email, password } });
            const login = await request('/auth/session', { method: 'POST', data: { email, password } });
            assert.equal((await login.json()).redirectTo, '/' + role);
            return {
                token: (await api.json()).data.token,
                cookie: login.headers.get('set-cookie').split(';')[0],
                user: await User.findOne({ email }).lean(),
            };
        };

        const health = await request('/api/health');
        assert.equal((await health.json()).data.status, 'ok');
        assert.equal(health.headers.get('referrer-policy'), 'same-origin');
        await request('/courses', { status: 401 });
        await request('/api/auth/me', { token: 'invalid', status: 401 });
        await request('/api/missing', { status: 404 });
        assert.equal((await request('/student', { status: 302 })).headers.get('location'), '/auth/login');
        assert.equal((await request('/account', { status: 302 })).headers.get('location'), '/auth/login');

        const admin = await account('Admin', 'admin');
        const faculty = await account('Faculty', 'faculty');
        const otherFaculty = await account('OtherFaculty', 'faculty');
        const student = await account('Student');
        const second = await account('Second');
        const third = await account('Third');
        const assistant = await account('Assistant');
        assert.match(await (await request('/api/auth/me', student)).text(), /"role":"student"/);
        await request('/admin', { ...student, status: 403 });
        await request('/admin/users/' + assistant.user._id + '/access', {
            ...admin, method: 'POST', form: { role: 'faculty', isActive: 'true' }, status: 303,
        });
        await request('/student', { ...assistant, status: 403 });

        await request('/admin/courses', {
            ...admin, method: 'POST', origin: 'https://example.invalid',
            form: { code: 'BAD', title: 'Invalid origin', credits: 3, department: 'Computer Science' }, status: 403,
        });
        await request('/admin/courses', {
            ...admin, method: 'POST',
            form: { code: 'cs101', title: 'Intro to Computing', credits: 3, department: 'Computer Science' }, status: 303,
        });
        const invalidCourse = await request('/admin/courses', {
            ...admin, method: 'POST', browserForm: true,
            form: { code: 'DRAFT', title: '   ', credits: 3, department: 'Computer Science' }, status: 400,
        });
        assert.equal((await invalidCourse.json()).errors[0].field, 'title');
        const savedCourse = await request('/admin/courses', {
            ...admin, method: 'POST', browserForm: true,
            form: { code: 'DRAFT', title: 'Browser form save', credits: 3, department: 'Computer Science' },
        });
        assert.equal((await savedCourse.json()).redirectTo, '/admin/courses');
        assert.match(await (await request('/admin/courses', admin)).text(), /Course created/);
        const courseList = await (await request('/courses', admin)).json();
        const intro = courseList.data.find(course => course.code === 'CS101');
        assert.ok(intro);
        const createCourse = async (code, prerequisites = [], credits = 3) => {
            const response = await request('/api/courses', {
                ...admin, method: 'POST', data: { code, title: 'Test ' + code, credits, department: 'Computer Science', prerequisites }, status: 201,
            });
            return (await response.json()).data;
        };
        const advanced = await createCourse('CS201', [intro._id]);
        const collision = await createCourse('CS110');
        const filteredCourses = await (await request('/api/courses?department=Computer+Science&limit=1&page=2&sort=title', student)).json();
        assert.equal(filteredCourses.data.length, 1);
        assert.equal(filteredCourses.meta.page, 2);
        await request('/api/courses', {
            ...admin, method: 'POST', status: 409,
            data: { code: 'CS101', title: 'Duplicate code', credits: 3, department: 'Computer Science' },
        });
        const draft = courseList.data.find(course => course.code === 'DRAFT');
        await request('/api/courses/' + draft._id, { ...admin, method: 'DELETE', status: 204 });
        await request('/api/courses/' + draft._id, { ...admin, status: 404 });
        await request('/courses/' + intro._id, {
            ...admin, method: 'PATCH', data: { prerequisites: [advanced._id] }, status: 400,
        });
        await request('/courses/' + advanced._id, { ...admin, method: 'PATCH', data: { title: 'Advanced Computing' } });
        const search = await request('/catalog/courses?q=Advanced');
        assert.match(await search.text(), /Advanced Computing/);
        assert.match(await (await request('/catalog/courses?q=%5B')).text(), /No courses found/);

        const createSection = async (course, sectionCode, capacity = 1, start = 540) => {
            const response = await request('/api/sections', {
                ...admin, method: 'POST', status: 201, data: {
                    course: course._id, term: '2026-1', sectionCode, faculty: String(faculty.user._id), capacity,
                    schedule: [{ day: 'SAT', start, end: start + 60, room: 'Lab 1' }],
                },
            });
            return (await response.json()).data;
        };
        const section = await createSection(intro, 'A1');
        const advancedSection = await createSection(advanced, 'A1', 20, 700);
        const collisionSection = await createSection(collision, 'A1', 20);
        const meetingForm = {
            course: advanced._id, sectionCode: 'B1', term: '2026-1',
            faculty: String(faculty.user._id), capacity: 12, status: 'open',
            'meetings[0][day]': 'MON', 'meetings[0][start]': '09:00',
            'meetings[0][end]': '10:00', 'meetings[0][room]': 'Lab 2',
            'meetings[2][day]': 'WED', 'meetings[2][start]': '09:00',
            'meetings[2][end]': '10:00', 'meetings[2][room]': 'Lab 3',
        };
        await request('/admin/sections', { ...admin, method: 'POST', form: meetingForm, status: 303 });
        const browserSection = await Section.findOne({ sectionCode: 'B1' });
        assert.equal(browserSection.schedule.length, 2);
        await request('/admin/sections/' + browserSection._id + '/edit', {
            ...admin, method: 'POST', form: { ...meetingForm, capacity: 14 }, status: 303,
        });
        assert.equal((await Section.findById(browserSection._id)).capacity, 14);
        await request('/admin/sections/' + browserSection._id + '/delete', {
            ...admin, method: 'POST', form: {}, status: 303,
        });

        await request('/courses/' + intro._id, { ...admin, method: 'DELETE', status: 409 });
        await request('/api/sections/' + section._id + '/roster', { ...otherFaculty, status: 404 });
        const enroll = (account, section, status = 201) => request('/api/enrollments', {
            ...account, method: 'POST', data: { section: section._id }, status,
        });

        await enroll(student, advancedSection, 409);
        const firstRecord = (await (await enroll(student, section)).json()).data;
        assert.equal(firstRecord.status, 'enrolled');
        await enroll(student, section, 409);
        const sameCourse = await createSection(intro, 'A2', 1, 660);
        await enroll(student, sameCourse, 409);
        await enroll(student, collisionSection, 409);
        const waiting = (await (await enroll(second, section)).json()).data;
        const waitingNext = (await (await enroll(third, section)).json()).data;
        assert.equal(waiting.status, 'waitlisted');
        assert.equal(waitingNext.status, 'waitlisted');
        await request('/api/enrollments/' + firstRecord._id, { ...second, method: 'DELETE', status: 404 });
        await request('/student/enrollments/' + firstRecord._id + '/drop', {
            ...student, method: 'POST', form: {}, status: 303,
        });
        assert.equal((await Enrollment.findById(waiting._id)).status, 'enrolled');
        assert.equal((await Enrollment.findById(waitingNext._id)).status, 'waitlisted');
        assert.equal((await Section.findById(section._id)).enrolledCount, 1);
        assert.match(await (await request('/student/enrollments', student)).text(), /registration was dropped/);
        assert.match(await (await request('/student/schedule', second)).text(), /Saturday[\s\S]*Lab 1/);

        await request('/faculty/sections/' + section._id + '/grades', {
            ...faculty, method: 'POST', form: { ['grade[' + waiting._id + ']']: 'A-' }, status: 303,
        });
        const transcript = await (await request('/api/enrollments/transcript', second)).json();
        assert.equal(transcript.data.gpa, 3.7);
        assert.match(await (await request('/student/transcript', second)).text(), /3\.70/);
        assert.equal((await (await enroll(second, advancedSection)).json()).data.status, 'enrolled');

        const parallelSection = await createSection(collision, 'RACE');
        const simultaneous = await Promise.all([enroll(student, parallelSection), enroll(third, parallelSection)]);
        const statuses = await Promise.all(simultaneous.map(async response => (await response.json()).data.status));
        assert.deepEqual(statuses.sort(), ['enrolled', 'waitlisted']);
        assert.equal((await Section.findById(parallelSection._id)).enrolledCount, 1);

        const report = await (await request('/api/reports', admin)).json();
        assert.equal(report.data.waitlisted, 2);
        await request('/api/sections/' + parallelSection._id, { ...admin, method: 'PATCH', data: { capacity: 2 } });
        assert.equal((await Section.findById(parallelSection._id)).enrolledCount, 2);

        const creditCheck = await account('Credits');
        const sixCreditSections = [];
        for (let index = 0; index < 4; index += 1) {
            const course = await createCourse('CREDIT' + index, [], 6);
            sixCreditSections.push(await createSection(course, 'A1', 10, 540 + index * 60));
        }
        for (const section of sixCreditSections.slice(0, 3)) await enroll(creditCheck, section);
        assert.match(await (await enroll(creditCheck, sixCreditSections[3], 409)).text(), /18 credits/);
        const pages = [
            ['/admin', admin], ['/admin/courses', admin], ['/admin/courses/new', admin],
            ['/admin/courses/' + intro._id + '/edit', admin], ['/admin/sections', admin],
            ['/admin/sections/new', admin], ['/admin/sections/' + section._id + '/edit', admin],
            ['/admin/users', admin], ['/admin/reports', admin], ['/faculty', faculty],
            ['/faculty/sections', faculty], ['/faculty/sections/' + section._id + '/roster', faculty],
            ['/faculty/sections/' + section._id + '/grades', faculty], ['/student', second],
            ['/student/profile', second], ['/catalog/courses/' + intro._id, second],
        ];
        for (const [path, account] of pages) {
            assert.doesNotMatch(await (await request(path, account)).text(), /<%|undefined|UI preview/);
        }

        for (const member of [student, faculty, admin]) {
            const accountPage = await (await request('/account', member)).text();
            assert.match(accountPage, /data-profile-menu[\s\S]+Account settings/);
            assert.match(accountPage, /\/account\/password/);
            assert.doesNotMatch(accountPage, /CheckCredentials123!/);
        }

        const editedProfile = {
            name: 'Updated Faculty', email: 'updated.faculty@example.edu', department: 'Mathematics',
            role: 'admin', isActive: 'false',
        };
        await request('/account/profile', {
            ...faculty, method: 'POST', form: editedProfile, browserForm: true, status: 400,
        });
        await request('/account/profile', {
            ...faculty, method: 'POST', form: { ...editedProfile, currentPassword: password },
            origin: 'https://example.invalid', status: 403,
        });
        const updatedProfile = await request('/account/profile', {
            ...faculty, method: 'POST', form: { ...editedProfile, currentPassword: password }, browserForm: true,
        });
        assert.equal((await updatedProfile.json()).redirectTo, '/account');
        const updatedFaculty = await User.findById(faculty.user._id).lean();
        assert.equal(updatedFaculty.email, editedProfile.email);
        assert.equal(updatedFaculty.name, editedProfile.name);
        assert.equal(updatedFaculty.role, 'faculty');
        assert.equal(updatedFaculty.isActive, true);

        const facultySessions = await request('/auth/session', { method: 'POST', data: { email: updatedFaculty.email, password } });
        const anotherCookie = facultySessions.headers.get('set-cookie').split(';')[0];
        const newPassword = 'NewCheckCredentials456!';
        const passwordForm = { currentPassword: password, newPassword, confirmPassword: newPassword };
        const mismatch = await request('/account/password', {
            ...faculty, method: 'POST', browserForm: true,
            form: { ...passwordForm, confirmPassword: 'WrongConfirmation' }, status: 400,
        });
        assert.equal((await mismatch.json()).errors[0].field, 'confirmPassword');
        await request('/account/password', {
            ...faculty, method: 'POST', browserForm: true,
            form: { ...passwordForm, currentPassword: 'WrongCurrentPassword' }, status: 400,
        });
        const changed = await request('/account/password', {
            ...faculty, method: 'POST', browserForm: true, form: passwordForm,
        });
        const currentCookie = changed.headers.get('set-cookie').split(';')[0];
        assert.notEqual(currentCookie, faculty.cookie);
        assert.match(await (await request('/account', { cookie: currentCookie })).text(), /Password updated/);
        for (const cookie of [faculty.cookie, anotherCookie]) {
            await request('/account', { cookie, status: 302 });
        }
        await request('/api/auth/me', { ...faculty, status: 401 });
        await request('/api/auth/login', { method: 'POST', data: { email: updatedFaculty.email, password }, status: 401 });
        const newApi = await request('/api/auth/login', { method: 'POST', data: { email: updatedFaculty.email, password: newPassword } });
        const credentials = (await newApi.json()).data;
        assert.equal(credentials.user.password, undefined);
        assert.equal(credentials.user.authVersion, undefined);
        await request('/api/auth/me', { token: credentials.token });

        await request('/auth/logout', { ...student, method: 'POST', form: {}, origin: 'null', status: 403 });
        await request('/auth/logout', { ...student, method: 'POST', form: {}, status: 303 });
        await request('/student', { ...student, status: 302 });

        console.log('PASS: Live HTML and JSON, course and section CRUD, enrollment rules, grades, reports, and account security.');
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        if (mongoose.connection.readyState === 1 && mongoose.connection.name.startsWith('ucrs_test_')) {
            await mongoose.connection.dropDatabase();
        }
        await mongoose.disconnect();
    }
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
