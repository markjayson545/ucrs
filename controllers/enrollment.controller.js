const enrollmentService = require('../services/enrollment.service');
const transcriptService = require('../services/transcript.service');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
    success(res, await enrollmentService.listForStudent(req.user._id));
});

exports.schedule = asyncHandler(async (req, res) => {
    const enrollments = await enrollmentService.listForStudent(req.user._id);
    success(res, enrollmentService.timetable(enrollments));
});

exports.transcript = asyncHandler(async (req, res) => {
    success(res, await transcriptService.forStudent(req.user._id));
});

exports.register = asyncHandler(async (req, res) => {
    success(res, await enrollmentService.register(req.user._id, req.body.section), 201);
});

exports.drop = asyncHandler(async (req, res) => {
    await enrollmentService.drop(req.user._id, req.params.id);
    res.status(204).send();
});
