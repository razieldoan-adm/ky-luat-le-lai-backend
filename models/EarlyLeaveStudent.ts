import mongoose from "mongoose";

const earlyLeaveStudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    normalizedName: { type: String, required: true },
    className: { type: String, required: true },
    schoolYear: { type: String, required: true }, // 2025-2026
  },
  { timestamps: true }
);

// Load nhanh theo lớp + năm
earlyLeaveStudentSchema.index({ className: 1, schoolYear: 1 });

// Không trùng HS trong cùng lớp + năm
earlyLeaveStudentSchema.index(
  { normalizedName: 1, className: 1, schoolYear: 1 },
  { unique: true }
);

export default mongoose.model(
  "EarlyLeaveStudent",
  earlyLeaveStudentSchema
);
