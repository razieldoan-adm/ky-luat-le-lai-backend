// models/ClassHygieneScore.js
const mongoose = require("mongoose");

const ClassHygieneScoreSchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  scores: {
    type: [[[Number]]], // 3D: [ngày][buổi][loại lỗi]
    default: () =>
      Array(5).fill(0).map(() =>   // 5 ngày
        Array(2).fill(0).map(() => // 2 buổi
          Array(3).fill(0)         // 3 lỗi
        )
      ),
  },
  total: { type: Number, default: 0 }
});

module.exports = mongoose.model("ClassHygieneScore", ClassHygieneScoreSchema);
