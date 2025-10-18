// models/ClassAttendanceSummary.js
const mongoose = require("mongoose");

const ClassAttendanceSummarySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  studentName: { type: String, required: true },
  className: { type: String, required: true },
  grade: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  session: { type: String, enum: ["sáng", "chiều"], required: true },
  permission: { type: Boolean, default: false }, // false = không phép
});

ClassAttendanceSummarySchema.index(
  { studentId: 1, date: 1, session: 1 },
  { unique: true }
);

module.exports = mongoose.model("ClassAttendanceSummary", ClassAttendanceSummarySchema);
