const mongoose = require("mongoose");

const ClassLineUpSummarySchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  scores: { type: [Number], default: Array(10).fill(0) }, // 10 cột điểm
  total: { type: Number, default: 0 }
});

module.exports = mongoose.model("ClassLineUpSummary", ClassLineUpSummarySchema);
