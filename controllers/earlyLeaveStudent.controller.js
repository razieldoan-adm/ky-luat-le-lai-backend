const EarlyLeaveStudent = require("../models/EarlyLeaveStudent");

// ➕ Nhập HS (1 lần / năm)
exports.createEarlyLeaveStudent = async (req, res) => {
  try {
    const { name, normalizedName, className, schoolYear } = req.body;

    if (!name || !className || !schoolYear) {
      return res.status(400).json({
        message: "Thiếu dữ liệu",
      });
    }

    const student = await EarlyLeaveStudent.create({
      name,
      normalizedName,
      className,
      schoolYear,
    });

    res.json(student);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Học sinh đã tồn tại trong năm học",
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
    const { className, schoolYear } = req.query;

    if (!className || !schoolYear) {
      return res.status(400).json({
        message: "Thiếu className hoặc schoolYear",
      });
    }

    const list = await EarlyLeaveStudent.find({
      className,
      schoolYear,
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
