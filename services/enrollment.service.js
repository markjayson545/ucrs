const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');

const SORTABLE_FIELDS = ['term', 'status', 'grade'];
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.list = async ({ page = 1, limit = 10, q, course, sort = 'status'}) => {
    const filter = {};
    
}