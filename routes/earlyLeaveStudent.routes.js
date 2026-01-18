const express = require("express");
const router = express.Router();

const {
  createEarlyLeaveStudent,
  getEarlyLeaveStudentsByClass,
  getAllEarlyLeaveStudents,      // ⬅ thêm
  deleteEarlyLeaveStudent,       // ⬅ thêm
} = require("../controllers/earlyLeaveStudent.controller");

// ➕ nhập HS
router.post("/", createEarlyLeaveStudent);

// 📋 lấy tất cả (dùng khi filter = ALL)
router.get("/", getAllEarlyLeaveStudents);

// 📋 lấy DS theo lớp
router.get("/by-class", getEarlyLeaveStudentsByClass);

// ❌ xoá HS
router.delete("/:id", deleteEarlyLeaveStudent);

module.exports = router;
