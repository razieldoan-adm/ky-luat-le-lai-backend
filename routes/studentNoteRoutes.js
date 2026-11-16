const express = require('express');
const router = express.Router();

const {
  getStudentNotes,
  createStudentNote,
  updateStudentNote,
  deleteStudentNote,
} = require('../controllers/studentNoteController');

router.get('/', getStudentNotes);
router.post('/', createStudentNote);
router.put('/:id', updateStudentNote);
router.delete('/:id', deleteStudentNote);

module.exports = router;
