const express = require("express");
const router = express.Router();

const {
  createEarlyLeaveStudent,
  getEarlyLeaveStudentsByClass,
} = require("../controllers/earlyLeaveStudent.controller");

// ➕ nhập HS
router.post("/", createEarlyLeaveStudent);

// 📋 lấy DS theo lớp
router.get("/by-class", getEarlyLeaveStudentsByClass);

module.exports = router;
