const EarlyLeaveStudent = require("../models/EarlyLeaveStudent");

// ➕ Nhập HS (1 lần / năm)

// hàm chuẩn hóa tiếng Việt
const normalizeText = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

exports.createEarlyLeaveStudent = async (req, res) => {
  try {
    const { name, className } = req.body;

    if (!name || !className) {
      return res.status(400).json({
        message: "Thiếu tên hoặc lớp",
      });
    }

    const normalizedName = normalizeText(name);

    // 👉 nếu FE không gửi năm học thì backend tự sinh
    const year = new Date().getFullYear();
    const schoolYear = `${year}-${year + 1}`;

    const student = await EarlyLeaveStudent.create({
      name,
      normalizedName,
      className,
      schoolYear,
    });

    res.status(201).json(student);
  } catch (err) {
    console.error("❌ CREATE EARLY LEAVE ERROR:", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Học sinh đã tồn tại trong lớp năm học này",
      });
    }

    res.status(500).json({
      message: err.message,
    });
  }
};

// 📋 Lấy danh sách theo lớp
exports.getEarlyLeaveStudentsByClass = async (req, res) => {
  try {
    const { className} = req.query;

    if (!className ) {
      return res.status(400).json({
        message: "Thiếu className ",
      });
    }

    const list = await EarlyLeaveStudent.find({
      className: className.trim(),
      
    }).sort({ name: 1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// 📋 lấy tất cả
exports.getAllEarlyLeaveStudents = async (req, res) => {
  const list = await EarlyLeaveStudent.find().sort({
    className: 1,
    name: 1,
  });
  res.json(list);
};

// ❌ xoá
exports.deleteEarlyLeaveStudent = async (req, res) => {
  await EarlyLeaveStudent.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};
