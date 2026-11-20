const mongoose = require('mongoose');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const AppError = require('../utils/AppError');
const { pointsByLetter, calculateGpa } = require('../utils/gpa');

exports.forStudent = async (student) => {
    const enrollments = await Enrollment.find({ student, status: 'completed' })
        .populate('course', 'code title credits')
        .sort({ term: -1, 'grade.submittedAt': -1 })
        .lean();

    const records = enrollments.filter(record => record.course && Number.isFinite(record.grade?.points))
        .map(record => ({
            code: record.course.code,
            title: record.course.title,
            credits: record.course.credits,
            term: record.term,
            letter: record.grade.letter,
            points: record.grade.points,
        }));
    return {
        records,
        gpa: calculateGpa(records),
        credits: records.reduce((sum, record) => sum + record.credits, 0),
    };
};

exports.submitGrades = (faculty, sectionId, grades) => mongoose.connection.transaction(async session => {
    if (!grades || typeof grades !== 'object' || Array.isArray(grades)) {
        throw new AppError('Choose at least one grade to save.', 400);
    }
    const entries = Object.entries(grades).filter(([, letter]) => letter !== '');
    if (!entries.length) throw new AppError('Choose at least one grade to save.', 400);
    for (const [id, letter] of entries) {
        if (!mongoose.isObjectIdOrHexString(id) || typeof letter !== 'string' || !Object.hasOwn(pointsByLetter, letter)) {
            throw new AppError('Choose a valid letter grade for each student.', 400);
        }
    }

    const section = await Section.findOneAndUpdate(
        { _id: sectionId, faculty }, { $inc: { __v: 1 } }, { session }
    );
    if (!section) throw new AppError('Teaching section not found', 404);
    if (section.status === 'cancelled') throw new AppError('Grades cannot be entered for a cancelled section.', 409);

    const submittedAt = new Date();
    for (const [id, letter] of entries) {
        const result = await Enrollment.updateOne(
            { _id: id, section: sectionId, status: { $in: ['enrolled', 'completed'] } },
            { $set: { status: 'completed', grade: {
                letter, points: pointsByLetter[letter], submittedBy: faculty, submittedAt,
            } } },
            { session }
        );
        if (!result.matchedCount) throw new AppError('A selected student no longer belongs to this gradebook.', 409);
    }
    return { updated: entries.length };
});
