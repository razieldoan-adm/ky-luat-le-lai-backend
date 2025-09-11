const mongoose = require('mongoose');
const Setting = require('./Setting'); // để lấy disciplineMax từ admin config

const classWeeklyScoreSchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  academicScore: { type: Number, default: 0 }, // SĐB
  hygieneScore: { type: Number, default: 0 }, // Vệ sinh
  attendanceScore: { type: Number, default: 0 }, // Chuyên cần
  lineUpScore: { type: Number, default: 0 }, // Xếp hàng

  // ✅ mới
  totalViolation: { type: Number, default: 0 }, 
  totalScore: { type: Number, default: 0 },     
  rank: { type: Number, default: 0 },
}, { timestamps: true });

classWeeklyScoreSchema.index({ className: 1, weekNumber: 1 }, { unique: true });

// 🔧 Hàm tính toán điểm
async function calculateScores(doc) {
  const settings = await Setting.findOne();
  const DISCIPLINE_MAX = settings?.disciplineMax || 100;

  // totalViolation = tổng các lỗi
  doc.totalViolation = 
    (doc.hygieneScore || 0) +
    (doc.attendanceScore || 0) +
    (doc.lineUpScore || 0);

  // totalScore = disciplineMax - lỗi + academicScore
  doc.totalScore = DISCIPLINE_MAX - doc.totalViolation + (doc.academicScore || 0);
}

// middleware cho save
classWeeklyScoreSchema.pre('save', async function (next) {
  await calculateScores(this);
  next();
});

// middleware cho update
classWeeklyScoreSchema.pre('findOneAndUpdate', async function (next) {
  let update = this.getUpdate();
  if (!update) return next();

  const settings = await Setting.findOne();
  const DISCIPLINE_MAX = settings?.disciplineMax || 100;

  const hygiene = update.hygieneScore ?? this.get('hygieneScore') ?? 0;
  const attendance = update.attendanceScore ?? this.get('attendanceScore') ?? 0;
  const lineUp = update.lineUpScore ?? this.get('lineUpScore') ?? 0;
  const academic = update.academicScore ?? this.get('academicScore') ?? 0;

  update.totalViolation = hygiene + attendance + lineUp;
  update.totalScore = DISCIPLINE_MAX - update.totalViolation + academic;

  this.setUpdate(update);
  next();
});

module.exports = mongoose.model('ClassWeeklyScore', classWeeklyScoreSchema);
