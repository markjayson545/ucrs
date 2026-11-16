var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

/* GET home page. */
router.get('/', function(req, res, next) {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  const mongoStatus = states[mongoose.connection.readyState] || 'Unknown';
  res.render('index', {
    title: 'Express',
    mongoStatus: mongoStatus
  });
});

/* GET /test-mongo - test route to verify MongoDB reading & writing */
router.get('/test-mongo', async function(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB is not connected yet.',
        readyState: mongoose.connection.readyState
      });
    }

    // Dynamic test schema/model
    const TestModel = mongoose.models.MongoTest || mongoose.model('MongoTest', new mongoose.Schema({
      message: String,
      timestamp: { type: Date, default: Date.now }
    }));

    // Insert a new test record
    const createdDoc = await TestModel.create({
      message: 'MongoDB test write from Express container at ' + new Date().toISOString()
    });

    // Read back recent records
    const recentRecords = await TestModel.find().sort({ _id: -1 }).limit(5);
    const count = await TestModel.countDocuments();

    res.json({
      success: true,
      message: 'MongoDB is functional! Read and write operations succeeded.',
      database: mongoose.connection.name,
      totalRecords: count,
      createdDoc: createdDoc,
      recentRecords: recentRecords
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'MongoDB test failed',
      error: err.message
    });
  }
});

module.exports = router;
