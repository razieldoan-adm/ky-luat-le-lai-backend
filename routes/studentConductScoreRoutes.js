const express = require('express');

const router = express.Router();

const {
  getAllScores,
  getStudentScore,
  createOrUpdateScore,
  finalizeScore,
  deleteScore,
  finalizeClassWeek,
} = require('../controllers/studentConductScoreController');

const {
  verifyToken,
  isAdmin,
} = require('../middlewares/authMiddleware');


// ==========================================
// LẤY DANH SÁCH
// ==========================================

router.get(
  '/',
  verifyToken,
  getAllScores
);


// ==========================================
// LẤY ĐIỂM 1 HỌC SINH
// ==========================================

router.get(
  '/student',
  verifyToken,
  getStudentScore
);


// ==========================================
// TẠO / CẬP NHẬT
// ==========================================

router.post(
  '/',
  verifyToken,
  isAdmin,
  createOrUpdateScore
);


// ==========================================
// CHỐT TUẦN
// ==========================================

router.put(
  '/:id/finalize',
  verifyToken,
  isAdmin,
  finalizeScore
);


// ==========================================
// XÓA
// ==========================================

router.delete(
  '/:id',
  verifyToken,
  isAdmin,
  deleteScore
);
// ==========================================
// CHỐT TOÀN BỘ HỌC SINH CỦA LỚP / TUẦN
// ==========================================

router.post(
  '/finalize-class-week',
  verifyToken,
  isAdmin,
  finalizeClassWeek
);

module.exports = router;
