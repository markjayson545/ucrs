function errorHandler(err, req, res, next) {
    let status = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';
    let errors = err.errors || undefined;

    if (err.name === 'ValidationError') {                 // Mongoose schema validation
        status = 400;
        message = 'Validation failed';
        errors = Object.values(err.errors).map((e) => ({field: e.path, message: e.message}));
    } else if (err.name === 'CastError') {                // e.g. a malformed ObjectId
        status = 400;
        message = `Invalid value for ${err.path}`;
    } else if (err.code === 11000) {                      // duplicate key (unique index)
        status = 409;
        const field = Object.keys(err.keyValue || {})[0];
        message = field ? `${field} already exists` : 'Duplicate value';
    } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        status = 401;
        message = 'Invalid or expired token';
    } else if (err.type === 'entity.parse.failed') {      // bad JSON body
        status = 400;
        message = 'Malformed JSON in request body';
    }

    if (status === 500) {
        console.error(err);
        if (process.env.NODE_ENV === 'production') message = 'Internal Server Error';
    }

    if (res.locals.registrationForm && (status === 400 || status === 409)) {
        const draft = {};
        for (const field of ['name', 'email', 'idNumber', 'department']) {
            if (typeof req.body[field] === 'string') draft[field] = req.body[field];
        }
        return res.set('Cache-Control', 'no-store').status(status).render('auth/register', {
            title: 'Create your account',
            registrationDraft: draft,
            registrationError: errors?.map(error => error.message).join(' ') || message,
        });
    }

    if (res.locals.pageRequest && req.get('X-Portal-Form') === '1') {
        if (status >= 500) message = 'The portal could not save your changes. Try again.';
        return res.status(status).json({ success: false, message, errors });
    }

    if (res.locals.pageRequest) {
        return res.status(status).render('shared/error', {
            title: status === 404 ? 'Page not found' : 'Unable to continue',
            status,
            message,
            errors,
        });
    }

    const body = {success: false, message};
    if (errors) body.errors = errors;
    // Do not expose stack trace in production for security reasons
    if (status === 500 && process.env.NODE_ENV !== 'production') body.stack = err.stack;

    res.status(status).json(body);
}

module.exports = errorHandler;
