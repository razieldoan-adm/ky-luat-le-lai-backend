const mongoose = require("mongoose");

const ClassAttendanceSummarySchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  permission: { type: Boolean, default: false }, // false = nghỉ không phép, true = có phép
});

module.exports = mongoose.model("ClassAttendanceSummary", ClassAttendanceSummarySchema);
