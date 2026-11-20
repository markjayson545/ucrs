const reportService = require('../services/report.service');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');

exports.summary = asyncHandler(async (req, res) => {
    success(res, await reportService.summary(req.query.term));
});
