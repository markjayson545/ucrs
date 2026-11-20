require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedAdmin() {
    let uri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('MONGO_URI is not defined in your environment or .env file');
    }

    // If running directly on host machine (outside Docker), translate container host 'mongodb' to '127.0.0.1'
    const isDocker = fs.existsSync('/.dockerenv');
    if (!isDocker && uri.includes('@mongodb:')) {
        uri = uri.replace('@mongodb:', '@127.0.0.1:');
    }

    const email = (process.env.ADMIN_EMAIL || 'admin@ucrs.test').trim().toLowerCase();
    const name = process.env.ADMIN_NAME || 'System Admin';

    try {
        console.log('Connecting to database...');
        await mongoose.connect(uri);
        console.log('Connected to MongoDB.');

        let admin = await User.findOne({ email });

        if (!admin) {
            const password = process.env.ADMIN_PASSWORD;
            if (!password || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
                throw new Error('Set ADMIN_PASSWORD to at least 8 characters and at most 72 bytes.');
            }
            admin = await User.create({
                name,
                email,
                password,
                role: 'admin',
                isActive: true
            });
            console.log('Admin created successfully:');
            console.log(`  Name:     ${admin.name}`);
            console.log(`  Email:    ${admin.email}`);
            console.log(`  Role:     ${admin.role}`);
        } else {
            if (admin.role !== 'admin') {
                throw new Error('ADMIN_EMAIL belongs to a non-admin account. Choose another email.');
            }
            if (!admin.isActive) {
                admin.isActive = true;
                await admin.save();
                console.log(`Administrator '${email}' reactivated.`);
            } else {
                console.log(`Admin user already exists (${admin.email}) with role '${admin.role}'.`);
            }
        }
    } catch (error) {
        console.error('Error seeding admin:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from database.');
    }
}

seedAdmin();
