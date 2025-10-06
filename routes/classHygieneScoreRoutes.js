const express = require('express');
const router = express.Router();
const classHygieneScoreController = require('../controllers/classHygieneScoreController');

// --- ROUTES VỆ SINH LỚP HỌC (Sử dụng className thay cho classId) ---

// [POST] /api/class-hygiene-scores
// Lưu điểm vệ sinh theo tuần (Gửi mảng 30 điểm/lớp và được chia thành 5 bản ghi/ngày trong Controller)
router.post('/', classHygieneScoreController.saveClassHygieneScores);

// [GET] /api/class-hygiene-scores/by-week?weekNumber=X
// Lấy tất cả điểm vệ sinh chi tiết theo ngày của một tuần cụ thể
// (Controller sẽ gom các bản ghi ngày thành mảng 30 điểm cho Frontend)
router.get('/by-week', classHygieneScoreController.getByWeek);

// [GET] /api/class-hygiene-scores/summary?weekNumber=X
// Lấy tổng số lần vi phạm của mỗi lớp trong tuần (dùng cho báo cáo, bảng tổng kết)
router.get('/summary', classHygieneScoreController.getSummaryByWeek);


module.exports = router;
