const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const AppError = require('../utils/AppError');

function invalidImage(message) {
    return new AppError(message, 400, [{ field: 'image', message }]);
}

exports.prepare = async (file, remove, kind) => {
    if (remove === '1') {
        if (file) throw invalidImage('Choose a new image or remove the current one.');
        return { imageData: null, imageVersion: null };
    }
    if (!file) return {};
    const bytes = file.buffer;
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
    const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!jpeg && !png && !webp) throw invalidImage('Choose a JPEG, PNG, or WebP image.');
    const size = kind === 'profile' ? { width: 256, height: 256, fit: 'cover' }
        : { width: 1200, height: 800, fit: 'inside', withoutEnlargement: true };
    try {
        const imageData = await sharp(bytes, { limitInputPixels: 40000000 })
            .rotate().resize(size).webp({ quality: 82 }).toBuffer();
        return { imageData, imageVersion: randomUUID() };
    } catch {
        throw invalidImage('This image could not be read. Try another image under 40 megapixels.');
    }
};

exports.read = async (model, id) => {
    const record = await model.findById(id).select('imageData');
    if (!record?.imageData) throw new AppError('Image not found.', 404);
    return record.imageData;
};
