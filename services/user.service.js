const mongoose = require('mongoose');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const AppError = require('../utils/AppError');

exports.list = () => User.find()
    .select('name email idNumber department role isActive imageVersion').sort('name').lean();

exports.faculty = () => User.find({ role: 'faculty', isActive: true })
    .select('name').sort('name').lean();

async function findActiveAccount(userId, session) {
    const user = await User.findOne({ _id: userId, isActive: true }).select('+password').session(session);
    if (!user) throw new AppError('Your account is inactive.', 403);
    return user;
}

async function verifyCurrentPassword(user, password) {
    const message = 'Enter your current password to make this change.';
    if (!password || !(await user.comparePassword(password))) {
        throw new AppError(message, 400, [{ field: 'currentPassword', message }]);
    }
}

exports.updateProfile = (userId, { name, email, department, currentPassword }, image = {}) =>
    mongoose.connection.transaction(async session => {
        const user = await findActiveAccount(userId, session);
        if (email !== user.email) await verifyCurrentPassword(user, currentPassword);
        user.set({ name, email, department, ...image });
        await user.save({ session });
    });

exports.changePassword = (userId, { currentPassword, newPassword }) =>
    mongoose.connection.transaction(async session => {
        const user = await findActiveAccount(userId, session);
        await verifyCurrentPassword(user, currentPassword);
        user.password = newPassword;
        await user.save({ session });
        return user.authVersion;
    });

exports.updateAccess = (userId, { role, isActive }) => mongoose.connection.transaction(async session => {
    const user = await User.findOneAndUpdate(
        { _id: userId, role: { $ne: 'admin' } },
        { $inc: { __v: 1 } },
        { session, timestamps: false, returnDocument: 'after' }
    );
    if (!user) throw new AppError('Only student and faculty accounts can be updated here.', 404);

    if (user.role !== role) {
        if (await Enrollment.exists({ student: userId, status: { $in: ['enrolled', 'waitlisted'] } }).session(session)) {
            throw new AppError('Drop active registrations before changing this student’s role.', 409);
        }
        if (await Section.exists({ faculty: userId, status: 'open' }).session(session)) {
            throw new AppError('Reassign open teaching sections before changing this faculty member’s role.', 409);
        }
    }

    user.role = role;
    user.isActive = isActive;
    await user.save({ session });
});
