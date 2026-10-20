const express = require('express');
const router = express.Router();

const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ được upload file hình ảnh.'));
  },
});

const controller = require('../controllers/violationController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Route tĩnh đặt trước route tham số /:name.
router.get('/search', controller.searchViolations);
router.get('/unhandled/students', controller.getUnhandledViolationStudents);
router.get('/all/all-student', controller.getAllViolationStudents);
router.get('/count', controller.getViolationCount);
router.get('/unhandled/count', controller.getUnhandledViolationCount);
router.get('/students/multiple-violations/count', controller.countMultipleViolations);
router.get('/gvcn-limit', controller.getGVCNHandlingLimit);
router.post('/gvcn-limit', controller.toggleGVCNHandlingLimit);

// Duyệt hạ rèn luyện S2 theo học sinh/lớp/năm học/tuần.
router.post('/review-s2/approve', verifyToken, controller.approveWeeklyS2Review);

// Ghi nhận & xử lý
router.post('/', verifyToken, controller.createViolation);
router.patch('/:id/handle', controller.handleViolation);
router.put('/:id', verifyToken, controller.updateViolation);
router.delete('/:id', verifyToken, controller.deleteViolation);

// Hình ảnh vi phạm
router.post('/:id/images', verifyToken, upload.array('images', 5), controller.addViolationImages);
router.get('/:id/images/:fileId', verifyToken, controller.getViolationImage);
router.delete('/:id/images/:fileId', verifyToken, controller.deleteViolationImage);

// Route tham số để cuối.
router.get('/:name', controller.getViolationsByStudent);

module.exports = router;
