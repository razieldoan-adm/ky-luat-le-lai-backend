const mongoose = require('mongoose');

const classAttendanceSummarySchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  data: { type: [Number], required: true },
  total: { type: Number, required: true },
}, { timestamps: true });

// ✅ Đặt index ngay sau khi define schema
classAttendanceSummarySchema.index({ className: 1, weekNumber: 1 }, { unique: true });

// Cuối cùng export model
module.exports = mongoose.model('ClassAttendanceSummary', classAttendanceSummarySchema);
