const mongoose = require("mongoose");

const earlyLeaveStudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    normalizedName: { type: String, required: true },
    className: { type: String, required: true },
    schoolYear: { type: String, required: true }, // ví dụ: 2025-2026
  },
  { timestamps: true }
);

// ⚡ Load nhanh theo lớp + năm
earlyLeaveStudentSchema.index({ className: 1, schoolYear: 1 });

// ❌ Không cho trùng HS trong cùng lớp + năm
earlyLeaveStudentSchema.index(
  { normalizedName: 1, className: 1, schoolYear: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "EarlyLeaveStudent",
  earlyLeaveStudentSchema
);
