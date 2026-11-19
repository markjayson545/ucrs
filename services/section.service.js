const Section = require('../models/section.model');
const AppError = require('../utils/AppError');

const SORTABLE_FIELDS = ['course', 'instructor', 'term', 'schedule', 'capacity', 'enrolledCount', 'status'];
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.list = async ({ page = 1, limit = 10, q, course, term, sort = 'course' }) => {
    const filter = {};
    if (course) filter.course = String(course);
    if (term) filter.term = String(term);
    if (q) {
        const rx = new RegExp(escapeRegExp(String(q)), 'i');
        filter.$or = [{ sectionCode: rx }, { term: rx }];
    }
    const sortField = SORTABLE_FIELDS.includes(sort) ? sort : 'course';

    const [items, total] = await Promise.all([
        Section.find(filter)
            .sort(sortField)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('course', 'code title department')
            .populate('faculty', 'name email idNumber'),
        Section.countDocuments(filter)
    ]);

    return { items, total, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
};

exports.getById = async (id) => {
    const section = await Section.findById(id)
        .populate('course', 'code title department')
        .populate('faculty', 'name email idNumber');
    if (!section) throw new AppError('Section not found', 404);
    return section;
};

exports.getByIdWithSchedule = async (id) => {
    const section = await Section.findById(id)
        .populate('course', 'code title department')
        .populate('faculty', 'name email idNumber')
        .populate('schedule', 'days startTime endTime location');
    if (!section) throw new AppError('Section not found', 404);
    return section;
};

async function assertCourseAndFacultyExist(courseId, facultyId) {
    const [courseExists, facultyExists] = await Promise.all([
        Section.exists({ course: courseId }),
        Section.exists({ faculty: facultyId })
    ]);
    if (!courseExists) throw new AppError('Course does not exist', 400);
    if (!facultyExists) throw new AppError('Faculty does not exist', 400);
    return { courseExists, facultyExists };
};

exports.create = async (data) => {
    const { course, faculty } = data;
    await assertCourseAndFacultyExist(course, faculty);
    return await Section.create(data);
};

exports.update = async (id, data) => {
    const allowedFields = ['term', 'sectionCode', 'faculty', 'capacity', 'schedule', 'status'];
    const updates = {};
    for (const key of allowedFields) if (data[key] !== undefined) updates[key] = data[key];

    if (updates.course || updates.faculty) {
        const courseId = updates.course || (await Section.findById(id)).course;
        const facultyId = updates.faculty || (await Section.findById(id)).faculty;
        await assertCourseAndFacultyExist(courseId, facultyId);
    }
    return await Section.findByIdAndUpdate(id, updates, { new: true });
};

exports.remove = async (id) => {
    const section = await Section.findByIdAndDelete(id);
    if (!section) throw new AppError('Section not found', 404);
    return section;
};
