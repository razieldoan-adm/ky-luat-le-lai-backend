const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');

router.post('/', classController.createOrUpdateClass);
router.get('/', classController.getAllClasses);
router.get('/with-teacher', classController.getClassesWithTeacher);
router.get('/discipline-summary', classController.getClassDisciplineSummary);
router.get('/count', classController.getClassCount);
module.exports = router;
