const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');

const SORTABLE_FIELDS = ['term', 'status', 'grade'];
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.list = async ({ page = 1, limit = 10, q, course, sort = 'status'}) => {
    const filter = {};
    if (course) filter.course = String(course);
    if (q) {
        const rx = new RegExp(escapeRegExp(String(q)), 'i');
        filter.$or = [{term: rx}, {status: rx}, {grade: rx}];
    }
    const sortField = SORTABLE_FIELDS.includes(sort) ? sort : 'status';

    const [items, total] = await Promise.all([
        Enrollment.find(filter)
            .sort(sortField)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('student', 'name email idNumber')
            .populate('course', 'code title department'),
        Enrollment.countDocuments(filter)
    ]);
    return { items, total, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
};

exports.getById = async (id) => {
    const enrollment = await Enrollment.findById(id)
        .populate('student', 'name email idNumber')
        .populate('course', 'code title department');
    if (!enrollment) throw new AppError('Enrollment not found', 404);
    return enrollment;
};

async function assertStudentAndCourseExist(studentId, courseId) {
    const [studentExists, courseExists] = await Promise.all([
        Enrollment.exists({ student: studentId }),
        Enrollment.exists({ course: courseId })
    ]);
    if (!studentExists) throw new AppError('Student does not exist', 400);
    if (!courseExists) throw new AppError('Course does not exist', 400);
    return { studentExists, courseExists };
};

exports.create = async (data) => {
    const { student, course, term, status, grade } = data;
    await assertStudentAndCourseExist(student, course);
    return Enrollment.create({ student, course, term, status, grade });
};

exports.update = async (id, data) => {
    const allowedFields = ['term', 'status', 'grade'];
    const updates = {};
    for (const key of allowedFields) if (data[key] !== undefined) updates[key] = data[key];

    const enrollment = await Enrollment.findByIdAndUpdate(id, updates
, { new: true, runValidators: true });
    if (!enrollment) throw new AppError('Enrollment not found', 404);
    return enrollment;
};

exports.remove = async (id) => {
    const enrollment = await Enrollment.findByIdAndDelete(id);
    if (!enrollment) throw new AppError('Enrollment not found', 404);
    return enrollment;
}