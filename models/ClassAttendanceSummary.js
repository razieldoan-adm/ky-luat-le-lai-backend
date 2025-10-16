const mongoose = require("mongoose");

const classAttendanceSummarySchema = new mongoose.Schema({
  className: { type: String, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  studentName: { type: String, required: true },
  date: { type: Date, required: true },
  session: { type: String, enum: ["Sáng", "Chiều"], required: true },
  recordedBy: { type: String, default: "GVCN" },

  // ✅ Thêm cờ nghỉ có phép hay không
  isExcused: { type: Boolean, default: false }, // false = không phép, true = có phép

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ClassAttendanceSummary", classAttendanceSummarySchema);
