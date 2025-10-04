// models/ClassHygieneScore.js
const mongoose = require("mongoose");

const ViolationSchema = new mongoose.Schema({
  date: { type: Date, required: true }, // chỉ lưu ngày + giờ:phút
  session: { type: String, enum: ["morning", "afternoon"], required: true },
  violations: [
    {
      type: { type: String, required: true }, // ví dụ: "xếp hàng chậm", "ồn ào"
      count: { type: Number, default: 0 },
    },
  ],
});

const ClassHygieneScoreSchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  records: [ViolationSchema], // danh sách vi phạm có ngày kèm lỗi
  total: { type: Number, default: 0 },
});

module.exports = mongoose.model("ClassHygieneScore", ClassHygieneScoreSchema);
