const express = require("express");
const router = express.Router();
const controller = require("../controllers/classLineUpSummaryController");

const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 10,
    fileSize: 15 * 1024 * 1024,
  },
});

// 🔹 Ghi nhận vi phạm xếp hàng (tạo mới)
router.post("/", controller.createRecord);

// ============================================================ 
// HÌNH ẢNH VI PHẠM 
// ============================================================ 
// Upload tối đa 10 ảnh 
router.post( "/:id/images", upload.array("images", 10), controller.uploadImages ); 
// Xem ảnh 
router.get( "/:id/images/:fileId", controller.getImage ); 
// Xóa ảnh 
router.delete( "/:id/images/:fileId", controller.deleteImage ); 

// ============================================================ 
// CÁC API HIỆN TẠI 
// ============================================================

// 🔹 Lấy tất cả bản ghi (nếu cần)
router.get("/", controller.getAllRecords);

// 🔹 Lấy danh sách vi phạm trong tuần hiện tại hoặc theo tuần cụ thể
router.get("/weekly", controller.getWeeklySummary);

// 🔹 Xóa vi phạm
router.delete("/:id", controller.deleteRecord);

// 🔹 Tổng hợp điểm xếp hàng theo lớp trong tuần + tự lưu vào ClassWeeklyScore
router.get("/total", controller.getClassLineUpTotal);

// 🔹 Cập nhật hoặc tạo mới điểm xếp hàng theo lớp trong tuần (thủ công)
router.post("/update-weekly-score", controller.updateWeeklyLineUpScore);

module.exports = router;
