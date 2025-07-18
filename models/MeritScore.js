// models/MeritScore.js
const mongoose = require('mongoose');

const meritScoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  className: { type: String, required: true },
  meritscore: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }, // Khi được cập nhật
});

module.exports = mongoose.model('MeritScore', meritScoreSchema);
