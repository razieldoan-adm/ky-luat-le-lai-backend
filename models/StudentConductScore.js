const mongoose = require('mongoose');

const studentConductScoreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    weekNumber: { type: Number, required: true, min: 1 },

    maxScore: { type: Number, default: 100 },

    // Dùng Mixed để lưu được mã nhóm động N6, N7, S2, S3...
    // Dữ liệu cũ N1-N5/S1 vẫn giữ nguyên dạng object.
    groupViolations: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    totalConductViolations: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    finalScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },

    hasSeriousViolation: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ['DRAFT', 'FINAL'],
      default: 'DRAFT',
    },
  },
  { timestamps: true }
);

studentConductScoreSchema.index(
  { name: 1, className: 1, academicYear: 1, weekNumber: 1 },
  { unique: true }
);

studentConductScoreSchema.index({
  className: 1,
  academicYear: 1,
  weekNumber: 1,
});

studentConductScoreSchema.index({
  academicYear: 1,
  weekNumber: 1,
});

module.exports = mongoose.model(
  'StudentConductScore',
  studentConductScoreSchema
);
