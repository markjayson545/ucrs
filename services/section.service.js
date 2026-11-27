const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { overlaps } = require('../utils/time');
const { promoteWaitlist } = require('./enrollment.service');

function withDetails(query) {
    return query.populate('course', 'code title department').populate('faculty', 'name').lean();
}

exports.list = (filter = {}) => withDetails(Section.find(filter).sort({ term: -1, sectionCode: 1 }));

exports.getById = async (id, filter = {}) => {
    const section = await withDetails(Section.findOne({ ...filter, _id: id }));
    if (!section) throw new AppError('Section not found', 404);
    return section;
};

exports.roster = async (faculty, sectionId) => {
    const section = await exports.getById(sectionId, { faculty });
    const records = await Enrollment.find({
        section: sectionId, status: { $in: ['enrolled', 'completed'] },
    }).populate('student', 'name idNumber email').sort('createdAt').lean();
    return { section, records: records.filter(record => record.student) };
};

async function checkFaculty(faculty, session) {
    const user = await User.findOneAndUpdate(
        { _id: faculty, role: 'faculty', isActive: true },
        { $inc: { __v: 1 } },
        { session, timestamps: false }
    );
    if (!user) {
        const message = 'Select an active faculty member.';
        throw new AppError(message, 400, [{ field: 'faculty', message }]);
    }
}

function checkSchedule(schedule) {
    for (const [index, meeting] of schedule.entries()) {
        if (meeting.start >= meeting.end) throw new AppError('Each meeting must end after it starts.', 400);
        const earlierMeeting = schedule.slice(0, index).findIndex(other => overlaps(meeting, other));
        if (earlierMeeting !== -1) {
            throw new AppError('Meetings in one section cannot overlap.', 400, [{
                field: `schedule.${index}.start`,
                message: `Meeting ${index + 1} overlaps with meeting ${earlierMeeting + 1}. Choose a different time or day.`,
            }]);
        }
    }
}

exports.create = (data) => mongoose.connection.transaction(async session => {
    const { course, faculty, term, sectionCode, capacity, schedule, status } = data;
    if (!await Course.findByIdAndUpdate(course, { $inc: { __v: 1 } }, { session })) {
        throw new AppError('Course not found', 404);
    }
    await checkFaculty(faculty, session);
    checkSchedule(schedule);
    const section = new Section({ course, faculty, term, sectionCode, capacity, schedule, status });
    await section.save({ session });
    return section;
});

exports.update = (id, data) => mongoose.connection.transaction(async session => {
    const section = await Section.findOneAndUpdate(
        { _id: id }, { $inc: { __v: 1 } },
        { session, timestamps: false, returnDocument: 'after' }
    );
    if (!section) throw new AppError('Section not found', 404);

    const active = await Enrollment.exists({
        section: id, status: { $in: ['enrolled', 'waitlisted'] },
    }).session(session);
    if (data.capacity !== undefined && data.capacity < section.enrolledCount) {
        const message = 'Capacity cannot be lower than the number of seats taken.';
        throw new AppError(message, 409, [{ field: 'capacity', message: `Enter at least ${section.enrolledCount} seats.` }]);
    }
    if (data.status === 'cancelled' && active) {
        const message = 'Drop active registrations before cancelling this section.';
        throw new AppError(message, 409, [{ field: 'status', message }]);
    }
    if ((data.faculty && !section.faculty.equals(data.faculty)) ||
        (data.status === 'open' && section.status !== 'open')) {
        await checkFaculty(data.faculty || section.faculty, session);
    }
    if (data.schedule) {
        checkSchedule(data.schedule);
        const original = section.schedule.map(({ day, start, end, room = '' }) => ({ day, start, end, room }));
        if (active && JSON.stringify(original) !== JSON.stringify(data.schedule)) {
            throw new AppError('A section with active registrations must keep its meeting times and rooms.', 409);
        }
    }

    for (const key of ['sectionCode', 'faculty', 'capacity', 'schedule', 'status']) {
        if (data[key] !== undefined) section[key] = data[key];
    }
    await promoteWaitlist(section, session);
    await section.save({ session });
    return section;
});

exports.remove = (id) => mongoose.connection.transaction(async session => {
    const section = await Section.findOneAndUpdate(
        { _id: id }, { $inc: { __v: 1 } }, { session }
    );
    if (!section) throw new AppError('Section not found', 404);
    if (await Enrollment.exists({ section: id }).session(session)) {
        throw new AppError('Sections with registration history can be closed instead.', 409);
    }
    await section.deleteOne({ session });
});
