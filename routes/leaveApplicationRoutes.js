const express = require("express");
const router = express.Router();

const controller = require("../controllers/leaveApplicationController");
const {
  verifyToken,
  isAdmin,
} = require("../middlewares/authMiddleware");

// ============================================================
// 📝 ĐƠN XIN PHÉP VI PHẠM
// ============================================================

// Lấy các vi phạm có thể nộp đơn
router.get(
  "/eligible",
  verifyToken,
  controller.getEligibleViolations
);

// Tạo đơn xin phép
router.post(
  "/",
  verifyToken,
  controller.createApplication
);

router.post(
  "/direct",
  verifyToken,
  controller.createDirectApplication
);
// ============================================================
// 👨‍💼 ADMIN QUẢN LÝ ĐƠN
// ============================================================

// Xem danh sách đơn
router.get(
  "/",
  verifyToken,
  isAdmin,
  controller.getApplications
);

// Xem chi tiết đơn
router.get(
  "/:id",
  verifyToken,
  isAdmin,
  controller.getApplicationById
);

// Duyệt đơn
router.patch(
  "/:id/approve",
  verifyToken,
  isAdmin,
  controller.approveApplication
);

// Từ chối đơn
router.patch(
  "/:id/reject",
  verifyToken,
  isAdmin,
  controller.rejectApplication
);

// Đánh dấu quá hạn
router.patch(
  "/:id/overdue",
  verifyToken,
  isAdmin,
  controller.markApplicationOverdue
);

module.exports = router;
