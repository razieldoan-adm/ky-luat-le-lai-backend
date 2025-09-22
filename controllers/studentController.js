// controllers/studentController.js
const Student = require('../models/Student');
const XLSX = require('xlsx');

exports.importExcel = async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Giả sử file excel có cột: "Tên", "Lớp"
    const students = rows.map(r => ({
      name: r['Tên'],
      className: r['Lớp'],
    }));

    await Student.deleteMany({}); // xoá cũ để import mới
    await Student.insertMany(students);

    res.json({ message: 'Import thành công', count: students.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi import' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy danh sách' });
  }
};
