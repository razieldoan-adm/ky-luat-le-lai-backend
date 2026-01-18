const mongoose = require("mongoose");

const earlyLeaveStudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    normalizedName: { type: String, required: true },
    className: { type: String, required: true },
  },
  { timestamps: true }
);

// ⚡ Load nhanh theo lớp
earlyLeaveStudentSchema.index({ className: 1 });

// ❌ Không cho trùng HS trong cùng lớp
earlyLeaveStudentSchema.index(
  { normalizedName: 1, className: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "EarlyLeaveStudent",
  earlyLeaveStudentSchema
);
