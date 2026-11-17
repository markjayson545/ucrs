const courseService = require('../services/course.service');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
    const { items, meta } = await courseService.list(req.query);
    success(res, items, 200, meta);
});

exports.getOne = asyncHandler(async (req, res) => {
    success(res, await courseService.getById(req.params.id));
});

exports.create = asyncHandler(async (req, res) => {
    success(res, await courseService.create(req.body), 201);
});

exports.update = asyncHandler(async (req, res) => {
    success(res, await courseService.update(req.params.id, req.body));
});

exports.remove = asyncHandler(async (req, res) => {
    await courseService.remove(req.params.id);
    res.status(204).send();
});