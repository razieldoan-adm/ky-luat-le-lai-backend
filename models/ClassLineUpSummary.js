import mongoose from "mongoose";

const classLineUpSummarySchema = new mongoose.Schema({
  className: { type: String, required: true },
  studentName: { type: String, default: "" },
  violation: { type: String, required: true },
  date: { type: Date, required: true },
  recorder: { type: String, required: true },
  scoreChange: { type: Number, default: 10 }, // ✅ mỗi lỗi +10 điểm
});

module.exports = mongoose.model("ClassLineUpSummary", classLineUpSummarySchema);
