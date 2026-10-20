const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    className: { type: String, required: true },
    academicYear: { type: String, required: true, trim: true },

    groupCode: { type: String, required: true, trim: true, uppercase: true },
    groupName: { type: String, default: '', trim: true },
    ruleCode: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, default: '' },
    penalty: { type: Number, default: 0 },

    handlingMethod: { type: String, default: '' },
    handled: { type: Boolean, default: false },
    handledBy: { type: String, enum: ['GVCN', 'PGT', ''], default: '' },
    handlingNote: { type: String, default: '' },

    // Chỉ dùng cho bản ghi S2 tự động; vi phạm thông thường không cần duyệt.
    s2ReviewStatus: {
      type: String,
      enum: ['NOT_APPLICABLE', 'PENDING', 'APPROVED'],
      default: 'NOT_APPLICABLE',
    },
    s2ApprovedBy: { type: String, default: '' },
    s2ApprovedAt: { type: Date, default: null },

    weekNumber: { type: Number, required: true },
    time: { type: Date, default: Date.now },

    images: [{
      fileId: { type: String, default: '' },
      url: { type: String, default: '' },
    }],
  },
  { timestamps: true }
);

violationSchema.index({ name: 1, className: 1, weekNumber: 1 });
violationSchema.index({ groupCode: 1, academicYear: 1, weekNumber: 1 });
violationSchema.index({ ruleCode: 1, academicYear: 1, weekNumber: 1 });
violationSchema.index({ name: 1, className: 1, academicYear: 1, weekNumber: 1, groupCode: 1 });

module.exports = mongoose.model('Violation', violationSchema);
