const mongoose = require("mongoose");
const { Schema } = mongoose;

const SessionScoresSchema = new Schema({
  absentDuty: { type: Number, default: 0 },
  noLightFan: { type: Number, default: 0 },
  notClosedDoor: { type: Number, default: 0 },
});

const ClassHygieneScoreSchema = new Schema({
  // LOẠI BỎ classId
  
  className: { type: String, required: true, trim: true }, // Dùng làm khóa chính
  grade: { type: String, required: true },
  date: { type: Date, required: true }, // Key: Lưu theo ngày
  weekNumber: { type: Number, required: true },

  sessions: { // Cấu trúc chi tiết 6 lỗi (3 Sáng, 3 Chiều)
    morning: { type: SessionScoresSchema, default: () => ({}) },
    afternoon: { type: SessionScoresSchema, default: () => ({}) },
  },
});

// Đảm bảo 1 lớp (className) - 1 ngày - 1 tuần chỉ có 1 bản ghi
// LƯU Ý: Nếu trang web của bạn chạy cho nhiều năm, bạn cần thêm year/semesterId vào index
ClassHygieneScoreSchema.index(
  { className: 1, date: 1, weekNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("ClassHygieneScore", ClassHygieneScoreSchema);
