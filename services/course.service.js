const mongoose = require('mongoose');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');

const sortableFields = ['code', 'title', 'department', 'credits'];
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.list = async ({ page = 1, limit = 10, q, department, sort = 'code' } = {}) => {
    const filter = {};
    if (department) filter.department = department;
    if (q) {
        const search = new RegExp(escapeRegExp(q), 'i');
        filter.$or = [{ code: search }, { title: search }];
    }
    const sortField = sortableFields.includes(sort) ? sort : 'code';
    const [items, total] = await Promise.all([
        Course.find(filter).sort({ [sortField]: 1, _id: 1 })
            .skip((page - 1) * limit).limit(limit).populate('prerequisites', 'code title'),
        Course.countDocuments(filter),
    ]);
    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
};

exports.all = () => Course.find().sort('code').populate('prerequisites', 'code title').lean();
exports.departments = async () => (await Course.distinct('department')).sort();

exports.getById = async (id) => {
    const course = await Course.findById(id).populate('prerequisites', 'code title');
    if (!course) throw new AppError('Course not found', 404);
    return course;
};

async function checkPrerequisites(ids, session, courseId) {
    const visited = new Set();
    const remaining = [...ids];
    while (remaining.length) {
        const id = String(remaining.pop());
        if (courseId?.equals(id)) throw new AppError('These prerequisites would create a cycle.', 400);
        if (visited.has(id)) continue;
        visited.add(id);

        const prerequisite = await Course.findByIdAndUpdate(id, { $inc: { __v: 1 } }, { session });
        if (!prerequisite) throw new AppError('One or more prerequisites do not exist.', 400);
        remaining.push(...prerequisite.prerequisites);
    }
}

exports.create = (data, image = {}) => mongoose.connection.transaction(async session => {
    const { code, title, description, credits, department, prerequisites = [] } = data;
    const uniqueIds = [...new Set(prerequisites.map(String))];
    await checkPrerequisites(uniqueIds, session);
    const course = new Course({ code, title, description, credits, department, prerequisites: uniqueIds, ...image });
    await course.save({ session });
    return course;
});

exports.update = (id, data, image = {}) => mongoose.connection.transaction(async session => {
    const course = await Course.findByIdAndUpdate(id, { $inc: { __v: 1 } }, {
        session, timestamps: false, returnDocument: 'after',
    });
    if (!course) throw new AppError('Course not found', 404);

    if (data.prerequisites !== undefined) {
        const uniqueIds = [...new Set(data.prerequisites.map(String))];
        await checkPrerequisites(uniqueIds, session, course._id);
        course.prerequisites = uniqueIds;
    }

    if (data.credits !== undefined && Number(data.credits) !== course.credits) {
        if (await Enrollment.exists({ course: id, status: { $ne: 'dropped' } }).session(session)) {
            throw new AppError('Credits stay fixed once students have registered for this course.', 409);
        }
        course.credits = data.credits;
    }
    for (const key of ['title', 'description', 'department']) {
        if (data[key] !== undefined) course[key] = data[key];
    }
    course.set(image);
    await course.save({ session });
    return course;
});

exports.remove = (id) => mongoose.connection.transaction(async session => {
    const course = await Course.findByIdAndUpdate(id, { $inc: { __v: 1 } }, { session });
    if (!course) throw new AppError('Course not found', 404);
    if (await Section.exists({ course: id }).session(session) ||
        await Course.exists({ prerequisites: id }).session(session) ||
        await Enrollment.exists({ course: id }).session(session)) {
        throw new AppError('This course is used by a section, prerequisite, or enrollment record.', 409);
    }
    await course.deleteOne({ session });
});
