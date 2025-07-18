const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  stt: Number,
  title: { type: String, required: true },
  point: { type: Number, required: true },
  content: String,
});

module.exports = mongoose.model('Rule', ruleSchema);