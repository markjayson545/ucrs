const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://user:pass@mongodb:27017/ucrs?authSource=admin';

  try {
    const conn = await mongoose.connect(uri);
    console.log(` Connected to MongoDB successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(' MongoDB connection error:', error.message);
  }
};

module.exports = connectDB;
