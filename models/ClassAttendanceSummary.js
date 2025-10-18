const mongoose = require("mongoose");

const ClassAttendanceSummarySchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  studentName: { type: String, required: true },
  date: { type: String, required: true }, // yyyy-mm-dd
  session: { type: String, enum: ["Sáng", "Chiều"], required: true },
  permission: { type: Boolean, default: false }, // false = không phép
  weekNumber: { type: Number, required: true },
});

module.exports = mongoose.model("ClassAttendanceSummary", ClassAttendanceSummarySchema);
