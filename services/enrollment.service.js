const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { overlaps } = require('../utils/time');
const { currentTerm, maxCredits, passingPoints } = require('../config/academic');

const activeStatuses = ['enrolled', 'waitlisted'];

exports.getCourseRegistration = (student, course) =>
    Enrollment.findOne({
        student, course, term: currentTerm,
        status: { $in: [...activeStatuses, 'completed'] },
    }).select('status').lean();

exports.listForStudent = (student, term = currentTerm) =>
    Enrollment.find({ student, term, status: { $in: activeStatuses } })
        .populate('course')
        .populate({ path: 'section', populate: { path: 'faculty', select: 'name' } })
        .sort('createdAt')
        .lean();

exports.timetable = (enrollments) =>
    enrollments.flatMap(enrollment =>
        (enrollment.section?.schedule || []).map(meeting => ({ enrollment, meeting }))
    ).sort((a, b) => a.meeting.start - b.meeting.start);

// Real writes to the student and section make simultaneous changes retry against fresh data.
async function lockStudent(studentId, session) {
    return User.findOneAndUpdate(
        { _id: studentId, role: 'student', isActive: true },
        { $inc: { __v: 1 } },
        { session, timestamps: false }
    );
}

async function lockSection(sectionId, session) {
    const section = await Section.findOneAndUpdate(
        { _id: sectionId }, { $inc: { __v: 1 } },
        { session, timestamps: false, returnDocument: 'after' }
    );
    if (!section) throw new AppError('Section not found', 404);
    return section;
}

async function checkEligibility(student, section, course, session, waitlistId) {
    const records = await Enrollment.find({
        student,
        term: section.term,
        status: { $in: ['enrolled', 'waitlisted', 'completed'] },
    }).session(session);

    const duplicate = records.some(record =>
        !record._id.equals(waitlistId) && record.course.equals(course._id)
    );
    if (duplicate) throw new AppError('You already have a registration for this course this term.', 409);

    const passed = await Enrollment.distinct('course', {
        student, status: 'completed', 'grade.points': { $gte: passingPoints },
        course: { $in: course.prerequisites },
    }).session(session);
    const passedIds = new Set(passed.map(String));
    if (course.prerequisites.some(id => !passedIds.has(String(id)))) {
        throw new AppError('Complete the listed prerequisites before registering.', 409);
    }

    const registered = records.filter(record => record.status !== 'waitlisted');
    const courses = await Course.find({ _id: { $in: registered.map(record => record.course) } })
        .select('credits').session(session);
    const creditsByCourse = new Map(courses.map(entry => [String(entry._id), entry.credits]));
    const credits = registered.reduce((sum, record) => sum + (creditsByCourse.get(String(record.course)) || 0), 0);
    if (credits + course.credits > maxCredits) {
        throw new AppError(`Registration would exceed ${maxCredits} credits this term.`, 409);
    }

    const confirmedSections = await Section.find({
        _id: { $in: registered.filter(record => record.status === 'enrolled').map(record => record.section) },
    }).select('schedule').session(session);
    const conflicts = confirmedSections.some(other =>
        other.schedule.some(existing => section.schedule.some(meeting => overlaps(existing, meeting)))
    );
    if (conflicts) throw new AppError('This section overlaps with a class on your schedule.', 409);
}

async function promoteWaitlist(section, course, session) {
    if (section.term !== currentTerm || section.status !== 'open' || section.enrolledCount >= section.capacity) return;
    const waiting = await Enrollment.find({ section: section._id, status: 'waitlisted' })
        .sort({ createdAt: 1, _id: 1 }).session(session);
    for (const record of waiting) {
        if (section.enrolledCount >= section.capacity) break;
        if (!await lockStudent(record.student, session)) continue;
        try {
            await checkEligibility(record.student, section, course, session, record._id);
        } catch (error) {
            if (error instanceof AppError && error.statusCode === 409) continue;
            throw error;
        }
        record.status = 'enrolled';
        await record.save({ session });
        section.enrolledCount += 1;
    }
}

exports.register = (student, sectionId) => mongoose.connection.transaction(async session => {
    const section = await lockSection(sectionId, session);
    if (section.status !== 'open' || section.term !== currentTerm) {
        throw new AppError('This section is closed for registration.', 409);
    }
    if (!await lockStudent(student, session)) throw new AppError('Student account is inactive.', 403);

    const course = await Course.findByIdAndUpdate(
        section.course, { $inc: { __v: 1 } }, { session, timestamps: false }
    );
    if (!course) throw new AppError('Course not found', 404);
    await checkEligibility(student, section, course, session);
    await promoteWaitlist(section, course, session);

    const status = section.enrolledCount < section.capacity ? 'enrolled' : 'waitlisted';
    const record = new Enrollment({ student, section: section._id, course: course._id, term: section.term, status });
    await record.save({ session });
    if (status === 'enrolled') section.enrolledCount += 1;
    await section.save({ session });
    return record;
});

exports.drop = (student, enrollmentId) => mongoose.connection.transaction(async session => {
    const record = await Enrollment.findOne({ _id: enrollmentId, student }).session(session);
    if (!record) throw new AppError('Enrollment not found', 404);
    if (!activeStatuses.includes(record.status) || record.term !== currentTerm) {
        throw new AppError('Only current enrollments and waitlist places can be dropped.', 409);
    }

    const section = await lockSection(record.section, session);
    if (!await lockStudent(student, session)) throw new AppError('Student account is inactive.', 403);
    const hadSeat = record.status === 'enrolled';
    record.status = 'dropped';
    await record.save({ session });

    if (hadSeat) {
        section.enrolledCount = Math.max(0, section.enrolledCount - 1);
        const course = await Course.findById(section.course).session(session);
        if (course) await promoteWaitlist(section, course, session);
        await section.save({ session });
    }
    return record;
});

exports.promoteWaitlist = async (section, session) => {
    const course = await Course.findById(section.course).session(session);
    if (course) await promoteWaitlist(section, course, session);
};
