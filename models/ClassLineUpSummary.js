// models/ClassLineUpSummary.js
const mongoose = require('mongoose');

const classLineUpSummarySchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  data: { type: [Number], required: true }, // Mảng 10 buổi
  total: { type: Number, required: true },
}, { timestamps: true });

classLineUpSummarySchema.index({ className: 1, weekNumber: 1 }, { unique: true });

module.exports = mongoose.model('ClassLineUpSummary', classLineUpSummarySchema);
