const mongoose = require('mongoose');

const classWeeklyScoreSchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  academicScore: { type: Number, default: 0 }, // SĐB
  disciplineScore: { type: Number, default: 0 }, // Kỷ luật
  hygieneScore: { type: Number, default: 0 }, // Vệ sinh
  attendanceScore: { type: Number, default: 0 }, // Chuyên cần
  lineUpScore: { type: Number, default: 0 }, // Xếp hàng
  totalScore: { type: Number, default: 0 }, // Tổng
  rank: { type: Number, default: 0 }, // Thứ hạng trong khối
}, { timestamps: true });

classWeeklyScoreSchema.index({ className: 1, weekNumber: 1 }, { unique: true });

module.exports = mongoose.model('ClassWeeklyScore', classWeeklyScoreSchema);
