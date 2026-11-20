const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const { currentTerm } = require('../config/academic');

exports.summary = async (term = currentTerm) => {
    const [sections, waiting] = await Promise.all([
        Section.find({ term, status: { $ne: 'cancelled' } }).populate('course', 'code title').sort('sectionCode').lean(),
        Enrollment.aggregate([
            { $match: { term, status: 'waitlisted' } },
            { $group: { _id: '$section', count: { $sum: 1 } } },
        ]),
    ]);

    const waitlists = new Map(waiting.map(row => [String(row._id), row.count]));
    const rows = sections.map(section => ({ ...section, waitlisted: waitlists.get(String(section._id)) || 0 }));
    const capacity = rows.reduce((sum, row) => sum + row.capacity, 0);
    const enrolled = rows.reduce((sum, row) => sum + row.enrolledCount, 0);
    const waitlisted = rows.reduce((sum, row) => sum + row.waitlisted, 0);
    return {
        sections: rows,
        capacity,
        enrolled,
        available: capacity - enrolled,
        waitlisted,
        utilization: capacity ? Math.round(enrolled / capacity * 100) : 0,
        openSections: rows.filter(section => section.status === 'open').length,
    };
};
