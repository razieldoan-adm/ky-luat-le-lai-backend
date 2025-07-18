const express = require('express');
const router = express.Router();
const controller = require('../controllers/violationController');

router.get('/search', controller.searchViolations);
router.get('/:name', controller.getViolationsByStudent);
router.post('/', controller.createViolation);
router.patch('/:id/handle', controller.markViolationHandled);
router.get('/unhandled/students', controller.getUnhandledViolationStudents);
router.get('/all/all-student', controller.getAllViolationStudents);
router.delete('/:id', controller.deleteViolation);
router.get('/count', controller.getViolationCount);
router.get('/unhandled/count', controller.getUnhandledViolationCount);
router.get('/students/multiple-violations/count', controller.countMultipleViolations);
module.exports = router;
