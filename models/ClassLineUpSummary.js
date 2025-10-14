const mongoose = require("mongoose");

const classLineUpSummarySchema = new mongoose.Schema({
  className: { type: String, required: true },
  studentName: { type: String, default: "" },
  violation: { type: String, required: true },
  date: { type: Date, required: true },
  recorder: { type: String, required: true },
  weekNumber: { type: Number, default: null }, // ✅ thêm trường này
  scoreChange: { type: Number, default: 10 }, // ✅ mỗi lỗi +10 điểm
  note: { type: String, default: "" }, // 🆕 Ghi chú (tùy chọn)
});

module.exports = mongoose.model("ClassLineUpSummary", classLineUpSummarySchema);
