const mongoose = require('mongoose');

const classHygieneScoreSchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  scores: {                     // ✅ thêm field này để lưu trạng thái checkbox
    type: [Boolean],
    default: [false, false, false, false, false] // T2-T6
  },
  totalScore: { type: Number, default: 0 },
});

module.exports = mongoose.model('ClassHygieneScore', classHygieneScoreSchema);
