const sectionService = require('../services/section.service');
const transcriptService = require('../services/transcript.service');
const { sectionInput } = require('../validators/section.validator');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
    const filter = {};
    if (typeof req.query.term === 'string') filter.term = req.query.term;
    if (typeof req.query.course === 'string') filter.course = req.query.course;
    success(res, await sectionService.list(filter));
});

exports.getOne = asyncHandler(async (req, res) => {
    success(res, await sectionService.getById(req.params.id));
});

exports.roster = asyncHandler(async (req, res) => {
    success(res, await sectionService.roster(req.user._id, req.params.id));
});

exports.grades = asyncHandler(async (req, res) => {
    success(res, await transcriptService.submitGrades(req.user._id, req.params.id, req.body.grade));
});

exports.create = asyncHandler(async (req, res) => {
    success(res, await sectionService.create(sectionInput(req.body)), 201);
});

exports.update = asyncHandler(async (req, res) => {
    success(res, await sectionService.update(req.params.id, sectionInput(req.body, { editing: true })));
});

exports.remove = asyncHandler(async (req, res) => {
    await sectionService.remove(req.params.id);
    res.status(204).send();
});
