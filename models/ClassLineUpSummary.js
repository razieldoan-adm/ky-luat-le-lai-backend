
// models/ClassLineUpSummary.js
const mongoose = require('mongoose');

const classLineUpSummarySchema = new mongoose.Schema({
  className: { type: String, required: true, trim: true, uppercase: true },
  date: { type: Date, required: true, default: Date.now },
  session: { type: String, enum: ['Sáng', 'Chiều', 'Khác'], default: 'Sáng' },
  violation: { type: String, required: true },
  studentName: { type: String, default: '' },
  note: { type: String, default: '' },
  recorder: { type: String, required: true },
  minusPoint: { type: Number, default: 10 },
});

module.exports = mongoose.model('ClassLineUpSummary', classLineUpSummarySchema);
