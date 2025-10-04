// models/ClassHygieneScore.js
const mongoose = require("mongoose");

const ViolationSchema = new mongoose.Schema({
  date: { type: Date, required: true }, // ngày + giờ:phút
  session: { type: String, enum: ["morning", "afternoon"], required: true },
  violations: [
    {
      type: { type: String, required: true }, // VD: "xếp hàng chậm"
      count: { type: Number, default: 0 },
    },
  ],
});

// Middleware: trước khi lưu thì bỏ giây & millisecond
ViolationSchema.pre("save", function (next) {
  if (this.date instanceof Date) {
    this.date.setSeconds(0);
    this.date.setMilliseconds(0);
  }
  next();
});

const ClassHygieneScoreSchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  records: [ViolationSchema],
  total: { type: Number, default: 0 },
});

module.exports = mongoose.model("ClassHygieneScore", ClassHygieneScoreSchema);
