const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { days } = require('../utils/time');

const fieldError = (field, message) => new AppError(message, 400, [{ field, message }]);

exports.sectionInput = (data, { editing = false } = {}) => {
    const section = {};
    if (!editing) {
        if (!mongoose.isObjectIdOrHexString(data.course)) throw fieldError('course', 'Select a course.');
        if (typeof data.term !== 'string' || !/^\d{4}-[1-9]\d?$/.test(data.term.trim())) {
            throw fieldError('term', 'Enter a term using the format YYYY-N, such as 2026-1.');
        }
        section.course = data.course;
        section.term = data.term.trim();
    }
    if (data.sectionCode !== undefined || !editing) {
        if (typeof data.sectionCode !== 'string' || !data.sectionCode.trim()) {
            throw fieldError('sectionCode', 'Enter a section code.');
        }
        section.sectionCode = data.sectionCode.trim();
    }
    if (data.faculty !== undefined || !editing) {
        if (!mongoose.isObjectIdOrHexString(data.faculty)) throw fieldError('faculty', 'Select a faculty member.');
        section.faculty = data.faculty;
    }
    if (data.capacity !== undefined || !editing) {
        const capacity = Number(data.capacity);
        if (!Number.isSafeInteger(capacity) || capacity < 1) throw fieldError('capacity', 'Enter a whole seat capacity above zero.');
        section.capacity = capacity;
    }
    if (data.status !== undefined) {
        if (!['open', 'closed', 'cancelled'].includes(data.status)) throw fieldError('status', 'Select a valid section status.');
        section.status = data.status;
    }
    if (data.schedule !== undefined || !editing) {
        if (!Array.isArray(data.schedule) || !data.schedule.length) throw new AppError('Add at least one class meeting.', 400);
        const errors = [];
        section.schedule = data.schedule.map((meeting, index) => {
            const { day, start, end, room } = meeting || {};
            const addError = (field, message) => {
                errors.push({ field: `schedule.${index}.${field}`, message: `Meeting ${index + 1}: ${message}` });
            };
            const validStart = Number.isInteger(start) && start >= 0 && start < 1440;
            const validEnd = Number.isInteger(end) && end > 0 && end <= 1440;
            if (!days.includes(day)) addError('day', 'Choose a day.');
            if (!validStart) addError('start', 'Enter a valid start time.');
            if (!validEnd) addError('end', 'Enter a valid end time or select “Ends at midnight.”');
            if (validStart && validEnd && start >= end) addError('end', 'End time must be later than start time.');
            if (room !== undefined && typeof room !== 'string') addError('room', 'Enter a room name.');
            return { day, start, end, room: typeof room === 'string' ? room.trim() : '' };
        });
        if (errors.length) {
            throw new AppError('Each meeting needs a day and a valid start and end time.', 400, errors);
        }
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
    end: row?.endsAtMidnight === '1' || row?.end === '24:00' ? 1440 : minutes(row?.end),
    room: row?.room,
});
