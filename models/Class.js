const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  className: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  teacher: {
    type: String,
    required: true,
    trim: true,
  },
  grade: { // ➡️ thêm grade ở đây
    type: String,
    required: true,
    trim: true,
  },
});

module.exports = mongoose.model('Class', classSchema);
