const express = require('express');
const router = express.Router();

const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ được upload file hình ảnh."));
    }
  },
});

const controller = require('../controllers/violationController');
const {verifyToken} = require('../middlewares/authMiddleware');
// 🔎 Tìm kiếm & lấy danh sách
router.get('/search', controller.searchViolations);
router.get('/unhandled/students', controller.getUnhandledViolationStudents);
router.get('/all/all-student', controller.getAllViolationStudents);

// ➕ Ghi nhận & xử lý
router.post('/', verifyToken, controller.createViolation);
router.patch('/:id/handle', controller.handleViolation); // ✅ Cập nhật chuẩn xử lý

// ❌ Xóa & thống kê
router.delete('/:id', verifyToken, controller.deleteViolation);
router.get('/count', controller.getViolationCount);
router.get('/unhandled/count', controller.getUnhandledViolationCount);
router.get('/students/multiple-violations/count', controller.countMultipleViolations);



router.put('/:id', verifyToken, controller.updateViolation);

router.get("/gvcn-limit", controller.getGVCNHandlingLimit);
router.post("/gvcn-limit", controller.toggleGVCNHandlingLimit);



// ============================================================
// VIOLATION IMAGES
// ============================================================

router.post(
  "/:id/images",
  verifyToken,
  upload.array("images", 5),
  controller.addViolationImages
);

router.get(
  "/:id/images/:fileId",
  verifyToken,
  controller.getViolationImage
);

router.delete(
  "/:id/images/:fileId",
  verifyToken,
  controller.deleteViolationImage
);
// 📌 Lấy vi phạm theo học sinh
router.get('/:name', controller.getViolationsByStudent);

module.exports = router;
