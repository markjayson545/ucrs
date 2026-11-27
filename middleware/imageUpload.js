const multer = require('multer');
const AppError = require('../utils/AppError');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 1000, fieldSize: 100 * 1024 },
}).single('image');

module.exports = (req, res, next) => {
    upload(req, res, error => {
        if (!error) return next();
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        const message = tooLarge ? 'Choose an image of 4 MB or less.' : 'Choose one image and try again.';
        next(new AppError(message, tooLarge ? 413 : 400, [{ field: 'image', message }]));
    });
};
