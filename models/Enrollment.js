const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const enrollmentSchema = new mongoose.Schema(
    {
        student: { type: ObjectId, ref: 'User', required: true },
        section: { type: ObjectId, ref: 'Section', required: true },
        course: { type: ObjectId, ref: 'Course', required: true },   // copied on purpose: cheap transcript and prereq queries
        term: { type: String, required: true },
        status: {
            type: String,
            enum: ['enrolled', 'waitlisted', 'dropped', 'completed'],
            default: 'enrolled',
        },
        grade: {
            letter: String,
            points: Number,
            submittedBy: { type: ObjectId, ref: 'User' },
            submittedAt: Date,
        },
    },
    { timestamps: true }
);

enrollmentSchema.index({ student: 1, term: 1, status: 1 });
enrollmentSchema.index({ section: 1, status: 1, createdAt: 1 });  // roster and waitlist order

// A student may have only ONE active enrollment per section, but may re-enrol after dropping.
// Partial indexes with $in need MongoDB 6.0+. Verify in Compass that it was created.
enrollmentSchema.index(
    { student: 1, section: 1 },
    { unique: true, partialFilterExpression: { status: { $in: ['enrolled', 'waitlisted'] } } }
);

module.exports = mongoose.model('Enrollment', enrollmentSchema);