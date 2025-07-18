const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  name: String,
  className: String,
  description: String,
  penalty: Number,
  
  handlingMethod: {
    type: String,
    default: '',
  },  
  time: {
    type: Date,
    default: Date.now,
  },
  weekNumber: Number,
  handled: {
    type: Boolean,
    default: false,
  },
  handled: {
    type: Boolean,
    default: false,
  }
});

module.exports = mongoose.model('Violation', violationSchema);
