// models/StudentNoteTemplate.js
const mongoose = require('mongoose');

const studentNoteTemplateSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'StudentNoteTemplate',
  studentNoteTemplateSchema
);
