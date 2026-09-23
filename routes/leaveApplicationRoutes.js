const express = require("express");
const router = express.Router();

const controller = require("../controllers/leaveApplicationController");
const { verifyToken } = require("../middlewares/authMiddleware");

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

// Lấy danh sách đơn
router.get(
  "/",
  verifyToken,
  controller.getApplications
);

// Xem chi tiết đơn
router.get(
  "/:id",
  verifyToken,
  controller.getApplicationById
);

// Duyệt đơn
router.patch(
  "/:id/approve",
  verifyToken,
  controller.approveApplication
);

// Từ chối đơn
router.patch(
  "/:id/reject",
  verifyToken,
  controller.rejectApplication
);

// Đánh dấu đơn quá hạn
router.patch(
  "/:id/overdue",
  verifyToken,
  controller.markApplicationOverdue
);

module.exports = router;
