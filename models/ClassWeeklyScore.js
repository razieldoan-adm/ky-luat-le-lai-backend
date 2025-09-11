const mongoose = require('mongoose');

const classWeeklyScoreSchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },

  academicScore: { type: Number, default: 0 },   // SĐB
  bonusScore: { type: Number, default: 0 },      // Điểm thưởng
  violationScore: { type: Number, default: 0 },  // Điểm vi phạm
  hygieneScore: { type: Number, default: 0 },    // Vệ sinh
  attendanceScore: { type: Number, default: 0 }, // Chuyên cần
  lineUpScore: { type: Number, default: 0 },     // Xếp hàng

  totalViolation: { type: Number, default: 0 },  // ✅ Tổng điểm nề nếp (disciplineMax - tổng trừ)
  totalScore: { type: Number, default: 0 },      // Tổng cuối (SĐB + điểm thưởng + totalViolation)
  rank: { type: Number, default: 0 },            // Thứ hạng trong khối
}, { timestamps: true });

classWeeklyScoreSchema.index({ className: 1, weekNumber: 1 }, { unique: true });

module.exports = mongoose.model('ClassWeeklyScore', classWeeklyScoreSchema);
