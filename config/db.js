const mongoose = require('mongoose');

async function connectDB() {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase';
    if (!uri){
        console.error('MongoDB URI is not defined. Please set the MONGO_URI environment variable.');
        process.exit(1);
    }
    try {
        await mongoose.connect(uri);
        console.log(`Connected to MongoDB at ${uri}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

module.exports = connectDB;