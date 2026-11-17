exports.success = (res, data, statusCode = 200, meta) => {
    const body = { success: data, data};
    if (meta) body.meta = meta;
    return res.status(statusCode).json(body);
}