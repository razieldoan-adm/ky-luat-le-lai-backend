const mongoose = require("mongoose");
const { Schema } = mongoose;

const SessionScoresSchema = new Schema({
  // 3 lỗi cho mỗi buổi (Sáng hoặc Chiều)
  absentDuty: { type: Number, default: 0 }, // Lỗi 1: Vắng trực vệ sinh
  noLightFan: { type: Number, default: 0 }, // Lỗi 2: Không tắt đèn/quạt
  notClosedDoor: { type: Number, default: 0 }, // Lỗi 3: Không đóng cửa
});

const ClassHygieneScoreSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
  className: { type: String, required: true }, // Thêm để tiện truy vấn
  grade: { type: String, required: true }, // Thêm để tiện truy vấn
  date: { type: Date, required: true }, // Ghi nhận theo ngày
  weekNumber: { type: Number, required: true },

  sessions: {
    morning: { type: SessionScoresSchema, default: () => ({}) }, // 3 lỗi buổi Sáng
    afternoon: { type: SessionScoresSchema, default: () => ({}) }, // 3 lỗi buổi Chiều
  },
});

// Chuẩn hóa ngày (đảm bảo mỗi lớp/ngày/tuần chỉ có 1 bản ghi)
ClassHygieneScoreSchema.pre("save", function (next) {
  if (this.date instanceof Date) {
    // Chỉ giữ lại ngày/tháng/năm
    this.date.setHours(0, 0, 0, 0); 
  }
  next();
});

// Đảm bảo 1 lớp - 1 ngày - 1 tuần chỉ có 1 bản ghi
ClassHygieneScoreSchema.index(
  { classId: 1, date: 1, weekNumber: 1 },
  { unique: true }
);

const ClassHygieneScore = mongoose.model("ClassHygieneScore", ClassHygieneScoreSchema);

module.exports = ClassHygieneScore;
