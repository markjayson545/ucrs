require('dotenv').config({ quiet: true });
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { currentTerm } = require('../config/academic');
const User = require('../models/User');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Enrollment = require('../models/Enrollment');
const { pointsByLetter } = require('../utils/gpa');
const { meetingFromForm } = require('../validators/section.validator');

const accounts = [
    { email: 'admin', name: 'Morgan Santos', role: 'admin', department: 'Registrar' },
    { email: 'faculty', name: 'Elena Reyes', role: 'faculty', department: 'Computer Science' },
    { email: 'daniel', name: 'Daniel Cruz', role: 'faculty', department: 'Mathematics' },
    { email: 'student', name: 'Alex Morgan', role: 'student', department: 'Computer Science', idNumber: 'DEMO-001' },
    { email: 'jamie', name: 'Jamie Rivera', role: 'student', department: 'Computer Science', idNumber: 'DEMO-002' },
    { email: 'sam', name: 'Sam Navarro', role: 'student', department: 'Mathematics', idNumber: 'DEMO-003' },
    { email: 'taylor', name: 'Taylor Garcia', role: 'student', department: 'Humanities', idNumber: 'DEMO-004' },
];

const courses = [
    {
        code: 'DEMO-CS101', title: 'Introduction to Computing', department: 'Computer Science',
        description: 'Solve problems with algorithms and write your first programs.',
    },
    {
        code: 'DEMO-CS201', title: 'Data Structures and Algorithms', department: 'Computer Science',
        description: 'Compare data structures and choose efficient algorithms for everyday problems.',
        prerequisites: ['DEMO-CS101'],
    },
    {
        code: 'DEMO-MATH201', title: 'Linear Algebra', department: 'Mathematics',
        description: 'Use vectors, matrices, and linear transformations to model problems.',
    },
    {
        code: 'DEMO-ENG102', title: 'Academic Writing', department: 'Humanities',
        description: 'Build clear arguments, evaluate sources, and revise academic essays.',
    },
    {
        code: 'DEMO-STAT201', title: 'Probability and Statistics', department: 'Mathematics',
        description: 'Analyze uncertainty and interpret evidence from samples.',
    },
];

const meeting = (day, start, end, room) => meetingFromForm({ day, start, end, room });
const sections = [
    {
        course: 'DEMO-CS101', sectionCode: 'A1', faculty: 'faculty', capacity: 24,
        schedule: [meeting('TUE', '09:00', '10:15', 'Tech 101')],
        registrations: [{ student: 'taylor' }],
    },
    {
        course: 'DEMO-CS201', sectionCode: 'A1', faculty: 'faculty', capacity: 2,
        schedule: [meeting('MON', '09:00', '10:15', 'Tech 204'), meeting('WED', '09:00', '10:15', 'Tech 204')],
        registrations: [{ student: 'jamie' }, { student: 'sam' }, { student: 'student', status: 'waitlisted' }],
    },
    {
        course: 'DEMO-MATH201', sectionCode: 'A1', faculty: 'daniel', capacity: 24,
        schedule: [meeting('TUE', '10:30', '11:45', 'Science 102'), meeting('THU', '10:30', '11:45', 'Science 102')],
        registrations: [{ student: 'student' }, { student: 'jamie' }],
    },
    {
        course: 'DEMO-ENG102', sectionCode: 'A1', faculty: 'faculty', capacity: 20,
        schedule: [meeting('FRI', '13:00', '14:15', 'Arts 201')],
        registrations: [{ student: 'student' }, { student: 'taylor' }],
    },
    {
        course: 'DEMO-STAT201', sectionCode: 'A1', faculty: 'daniel', capacity: 24, status: 'closed',
        schedule: [meeting('SAT', '09:00', '10:15', 'Science 103')],
        registrations: [{ student: 'sam' }],
    },
    {
        course: 'DEMO-STAT201', sectionCode: 'A2', faculty: 'daniel', capacity: 24, status: 'cancelled',
        schedule: [meeting('SAT', '10:30', '11:45', 'Science 103')],
        registrations: [],
    },
    {
        course: 'DEMO-CS101', sectionCode: 'A1', faculty: 'faculty', capacity: 24, status: 'closed', historical: true,
        schedule: [meeting('MON', '09:00', '10:15', 'Tech 101')],
        registrations: [
            { student: 'student', letter: 'A' }, { student: 'jamie', letter: 'A-' }, { student: 'sam', letter: 'B+' },
        ],
    },
    {
        course: 'DEMO-MATH201', sectionCode: 'A1', faculty: 'daniel', capacity: 24, status: 'closed', historical: true,
        schedule: [meeting('TUE', '10:30', '11:45', 'Science 102')],
        registrations: [{ student: 'sam', letter: 'B' }],
    },
];

const emailFor = name => `${name}@demo.ucrs.test`;
const seedId = 'mock-data';

async function insertMockData(password, historicalTerm, session) {
    // User.create runs the same password hashing hook as registration.
    const users = await User.create(
        accounts.map(account => ({ ...account, email: emailFor(account.email), password })),
        { session, ordered: true },
    );
    const userIds = new Map(users.map(user => [user.email, user._id]));
    const courseIds = new Map(courses.map(course => [course.code, new mongoose.Types.ObjectId()]));
    await Course.insertMany(courses.map(({ prerequisites = [], ...course }) => ({
        ...course, _id: courseIds.get(course.code), credits: 3,
        prerequisites: prerequisites.map(code => courseIds.get(code)),
    })), { session });

    const submittedAt = new Date();
    const enrollments = [];
    for (const { course, faculty, historical, registrations, ...fields } of sections) {
        const term = historical ? historicalTerm : currentTerm;
        const facultyId = userIds.get(emailFor(faculty));
        const records = registrations.map(({ student, status = 'enrolled', letter }) => ({
            student: userIds.get(emailFor(student)),
            term,
            status: letter ? 'completed' : status,
            grade: letter ? { letter, points: pointsByLetter[letter], submittedBy: facultyId, submittedAt } : undefined,
        }));
        const section = await new Section({
            ...fields, term, course: courseIds.get(course), faculty: facultyId,
            // Completed registrations still count toward seats taken in the portal.
            enrolledCount: records.filter(record => ['enrolled', 'completed'].includes(record.status)).length,
        }).save({ session });
        enrollments.push(...records.map(record => ({ ...record, section: section._id, course: section.course })));
    }
    await Enrollment.insertMany(enrollments, { session });
}

async function seedMockData() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Mock data can only be seeded outside production.');
    }
    const configuredPassword = process.env.MOCK_SEED_PASSWORD;
    const password = configuredPassword || randomBytes(16).toString('base64url');
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
        throw new Error('MOCK_SEED_PASSWORD must be at least 8 characters and at most 72 bytes.');
    }
    if (!/^\d{4}-[1-9]\d?$/.test(currentTerm) || currentTerm.startsWith('0000-')) {
        throw new Error('Set CURRENT_TERM to a valid year and term number, such as 2026-1.');
    }
    const priorYear = String(Number(currentTerm.slice(0, 4)) - 1).padStart(4, '0');
    const historicalTerm = priorYear + currentTerm.slice(4);

    await connectDB();
    const runs = mongoose.connection.collection('seedRuns');
    let previousRun;
    try {
        previousRun = await mongoose.connection.transaction(async session => {
            const existing = await runs.findOne({ _id: seedId }, { session });
            if (existing) return existing;
            // The marker and all sample records commit together.
            await runs.insertOne({ _id: seedId, term: currentTerm, createdAt: new Date() }, { session });
            await insertMockData(password, historicalTerm, session);
            return null;
        });
    } catch (error) {
        if (error.code !== 11000) throw error;
        // Another invocation may have committed while this one was starting.
        previousRun = await runs.findOne({ _id: seedId });
        if (!previousRun) {
            throw new Error('A mock email, campus ID, course code, or section code is already in use. No sample records were added.');
        }
    }

    if (previousRun) {
        console.log(`Mock data already seeded in "${mongoose.connection.name}" for term ${previousRun.term}.`);
        return;
    }
    console.log(`Mock data seeded in "${mongoose.connection.name}" for term ${currentTerm}, with grades from ${historicalTerm}.`);
    console.log(configuredPassword ? 'The demo accounts use MOCK_SEED_PASSWORD.' : `Password for the demo accounts: ${password}`);
    console.table(accounts.map(account => ({ email: emailFor(account.email), role: account.role })));
}

seedMockData()
    .catch(error => {
        console.error('Error seeding mock data:', error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
