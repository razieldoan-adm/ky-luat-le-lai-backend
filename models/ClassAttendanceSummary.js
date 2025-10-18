const mongoose = require("mongoose");

const ClassAttendanceSummarySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  studentName: { type: String, required: true },
  className: { type: String, required: true },
  grade: { type: String, required: true },
  date: { type: String, required: true }, // yyyy-mm-dd
  session: { type: String, enum: ["Sáng", "Chiều"], required: true },
  permission: { type: Boolean, default: false },
  weekNumber: { type: Number, required: true },
});

module.exports = mongoose.model("ClassAttendanceSummary", ClassAttendanceSummarySchema);
