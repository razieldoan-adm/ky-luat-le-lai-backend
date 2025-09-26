const mongoose = require('mongoose');

const classWeeklyScoreSchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },

  // Điểm học tập
  academicScore: { type: Number, default: 0 },  

  // Các mục nề nếp
  violationScore: { type: Number, default: 0 },   // vi phạm
  hygieneScore: { type: Number, default: 0 },     // vệ sinh
  attendanceScore: { type: Number, default: 0 },  // chuyên cần
  lineUpScore: { type: Number, default: 0 },      // xếp hàng

  // Điểm thưởng
  bonusScore: { type: Number, default: 0 },       

  // Tổng nề nếp = disciplineMax - (violation + hygiene + attendance + lineUp)
  totalViolation: { type: Number, default: 0 },   

  // Tổng cuối cùng = academicScore + bonusScore + totalViolation
  totalScore: { type: Number, default: 0 },       

  // Thứ hạng trong khối
  rank: { type: Number, default: 0 },

  lastUpdated: {
  type: Date,
  default: Date.now,
},
}, { timestamps: true });

// Đảm bảo mỗi lớp chỉ có 1 bản ghi/tuần
classWeeklyScoreSchema.index({ className: 1, weekNumber: 1 }, { unique: true });

module.exports = mongoose.model('ClassWeeklyScore', classWeeklyScoreSchema);
