// models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  className: { type: String, required: true },
  fatherPhone: { type: String, default: '' },
  motherPhone: { type: String, default: '' }
});

module.exports = mongoose.model('Student', studentSchema);
