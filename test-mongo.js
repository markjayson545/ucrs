require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb://user:pass@mongodb:27017/ucrs?authSource=admin';

async function testMongo() {
  console.log('--- MongoDB Functional Test ---');
  console.log('Connecting to:', uri.replace(/:[^:]*@/, ':****@'));

  try {
    await mongoose.connect(uri);
    console.log(' [1/3] Successfully connected to MongoDB server!');

    const TestSchema = new mongoose.Schema({
      title: String,
      createdAt: { type: Date, default: Date.now }
    });

    const TestModel = mongoose.models.CliTest || mongoose.model('CliTest', TestSchema);

    // Test write
    console.log(' [2/3] Writing test document to "clitests" collection...');
    const doc = await TestModel.create({ title: 'CLI verification test' });
    console.log(' Write success! Created document with _id:', doc._id.toString());

    // Test read
    console.log(' [3/3] Reading document back from database...');
    const foundDoc = await TestModel.findById(doc._id);
    console.log(' Read success! Retrieved title:', foundDoc.title);

    console.log(' All tests passed! MongoDB is fully functional.');
  } catch (err) {
    console.error(' MongoDB Test Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log(' Disconnected from MongoDB.');
    console.log('-------------------------------');
  }
}

testMongo();
