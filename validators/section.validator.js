const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { days } = require('../utils/time');

exports.sectionInput = (data, { editing = false } = {}) => {
    const section = {};
    if (!editing) {
        if (!mongoose.isObjectIdOrHexString(data.course)) throw new AppError('Select a course.', 400);
        if (typeof data.term !== 'string' || !/^\d{4}-[1-9]\d?$/.test(data.term.trim())) {
            throw new AppError('Enter a term using the format YYYY-N, such as 2026-1.', 400);
        }
        section.course = data.course;
        section.term = data.term.trim();
    }
    if (data.sectionCode !== undefined || !editing) {
        if (typeof data.sectionCode !== 'string' || !data.sectionCode.trim()) {
            throw new AppError('Enter a section code.', 400);
        }
        section.sectionCode = data.sectionCode.trim();
    }
    if (data.faculty !== undefined || !editing) {
        if (!mongoose.isObjectIdOrHexString(data.faculty)) throw new AppError('Select a faculty member.', 400);
        section.faculty = data.faculty;
    }
    if (data.capacity !== undefined || !editing) {
        const capacity = Number(data.capacity);
        if (!Number.isSafeInteger(capacity) || capacity < 1) throw new AppError('Enter a whole seat capacity above zero.', 400);
        section.capacity = capacity;
    }
    if (data.status !== undefined) {
        if (!['open', 'closed', 'cancelled'].includes(data.status)) throw new AppError('Select a valid section status.', 400);
        section.status = data.status;
    }
    if (data.schedule !== undefined || !editing) {
        if (!Array.isArray(data.schedule) || !data.schedule.length) throw new AppError('Add at least one class meeting.', 400);
        section.schedule = data.schedule.map(meeting => {
            if (!meeting || !days.includes(meeting.day) ||
                !Number.isInteger(meeting.start) || !Number.isInteger(meeting.end) ||
                meeting.start < 0 || meeting.end > 1440 || meeting.start >= meeting.end ||
                (meeting.room !== undefined && typeof meeting.room !== 'string')) {
                throw new AppError('Each meeting needs a day and a valid start and end time.', 400);
            }
            return { day: meeting.day, start: meeting.start, end: meeting.end, room: (meeting.room || '').trim() };
        });
    }
    return section;
};

function minutes(value) {
    if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
}

exports.meetingFromForm = row => ({
    day: row?.day,
    start: minutes(row?.start),
    end: row?.end === '24:00' ? 1440 : minutes(row?.end),
    room: row?.room,
});
