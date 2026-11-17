const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// Embedded because a schedule is always read together with its section.
const scheduleSchema = new mongoose.Schema(
    {
        day: { type: String, enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], required: true },
        start: { type: Number, required: true, min: 0, max: 1439 },   // minutes since midnight
        end: {
            type: Number,
            required: true,
            min: 1,
            max: 1440,
            validate: {
                validator: function (v) { return v > this.start; },       // custom validator
                message: 'End time must be after start time',
            },
        },
        room: { type: String, trim: true },
    },
    { _id: false }
);

const sectionSchema = new mongoose.Schema(
    {
        course: { type: ObjectId, ref: 'Course', required: true },
        term: { type: String, required: true, trim: true },           // e.g. "2026-1"
        sectionCode: { type: String, required: true, trim: true, uppercase: true },
        faculty: { type: ObjectId, ref: 'User', required: true },
        capacity: { type: Number, required: true, min: 1 },
        enrolledCount: { type: Number, default: 0, min: 0 },
        schedule: [scheduleSchema],
        status: { type: String, enum: ['open', 'closed', 'cancelled'], default: 'open' },
    },
    { timestamps: true }
);

// The same course cannot have the same section code twice in one term.
sectionSchema.index({ course: 1, term: 1, sectionCode: 1 }, { unique: true });
sectionSchema.index({ term: 1, faculty: 1 });

module.exports = mongoose.model('Section', sectionSchema);