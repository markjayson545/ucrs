const Course = require('../models/Course');
const AppError = require('../utils/AppError');

const SORTABLE_FIELDS = ['code', 'title', 'department', 'credits'];
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.list = async ({page = 1, limit = 10, q, department, sort = 'code'}) => {
    const filter = {};
    if (department) filter.department = String(department);
    if (q) {
        const rx = new RegExp(escapeRegExp(String(q)), 'i');
        filter.$or = [{code: rx}, {title: rx}];
    }
    const sortField = SORTABLE_FIELDS.includes(sort) ? sort : 'code';

    const [items, total] = await Promise.all([
        Course.find(filter)
            .sort(sortField)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('prerequisites', 'code title'),
        Course.countDocuments(filter)
    ]);

    return {items, meta: {total, page, limit, pages: Math.ceil(total / limit)}};
};

exports.getById = async (id) => {
    const course = await Course.findById(id).populate('prerequisites', 'code title');
    if (!course) throw new AppError('Course not found', 404);
    return course;
};

async function assertPrerequisitesExist(ids, selfId) {
    const uniqueIds = [...new Set(ids.map(String))];
    if (selfId && uniqueIds.includes(String(selfId))) {
        throw new AppError('A course cannot be its own prerequisite', 400);
    }
    const found = await Course.countDocuments({_id: {$in: uniqueIds}});
    if (found !== uniqueIds.length) {
        throw new AppError('One or more prerequisites do not exist', 400);
    }
}

exports.create = async (data) => {
    const { code, title, description, credits, department, prerequisites = [] } = data;
    await assertPrerequisitesExist(prerequisites);
    return Course.create({ code, title, description, credits, department, prerequisites });
};

exports.update = async (id, data) => {
    const allowedFields = ['title', 'description', 'credits', 'department', 'prerequisites'];
    const updates = {};
    for (const key in allowedFields) if (data[key] !== undefined) updates[key] = data[key];

    if (updates.prerequisites) await assertPrerequisitesExist(updates.prerequisites, id);

    const course = await Course.findByIdAndUpdate(id, updates, { new: true, runValidators: true});
    if (!course) throw new AppError('Course not found', 404);
    return course;
};

exports.remove = async (id) => {
    const course = await Course.findByIdAndDelete(id);
    if (!course) throw new AppError('Course not found', 404);
    return course;
}