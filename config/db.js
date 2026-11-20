const mongoose = require('mongoose');

module.exports = async function connectDB() {
    if (!process.env.MONGO_URI) throw new Error('Missing MONGO_URI');
    await mongoose.connect(process.env.MONGO_URI);
    const topology = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!topology.setName && topology.msg !== 'isdbgrid') {
        throw new Error('Use a MongoDB replica set for registration transactions. See the README for setup.');
    }
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    console.log('Connected to MongoDB');
};
