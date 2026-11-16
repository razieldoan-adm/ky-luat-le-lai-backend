// models/StudentNote.js
const mongoose = require('mongoose');

const studentNoteSchema = new mongoose.Schema(
  {
    students: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
          required: true,
        },
        studentName: {
          type: String,
          required: true,
        },
        className: {
          type: String,
          required: true,
        },
      },
    ],

    note: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentNote', studentNoteSchema);
