const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true, maxlength: 100
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,                     // creates a unique index
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false}, // hidden from queries by default
        role: {
            type: String,
            enum: ['student', 'faculty', 'admin'],
            default: 'student'},
        idNumber: {
            type: String,
            trim: true,
            unique: true,
            sparse: true},      // sparse: many users may have none
        department: {
            type: String,
            trim: true},
        imageData: { type: Buffer, select: false },
        imageVersion: String,
        isActive: {
            type: Boolean,
            default: true},
        authVersion: {
            type: Number,
            default: 0,
        },
    }, {timestamps: true}                  // adds createdAt and updatedAt
);

userSchema.pre('save', async function (){
   if (!this.isModified('password')) return;
   this.password = await bcrypt.hash(this.password, 12);
   // A password change invalidates previously issued sessions and bearer tokens.
   if (!this.isNew) this.authVersion = (this.authVersion ?? 0) + 1;
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.authVersion;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
