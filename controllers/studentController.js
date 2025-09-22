// controllers/studentController.js
const Student = require('../models/Student');
const XLSX = require('xlsx');

exports.importExcel = async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Giả sử Excel chỉ có: Tên, Lớp
    const students = rows.map(r => ({
      name: r['Tên'],
      className: r['Lớp']
    }));

    await Student.deleteMany({});
    await Student.insertMany(students);

    res.json({ message: 'Import thành công', count: students.length });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi import' });
  }
};

exports.getByClass = async (req, res) => {
  try {
    const { className } = req.query;
    const students = await Student.find(className ? { className } : {});
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy danh sách' });
  }
};

exports.updatePhones = async (req, res) => {
  try {
    const updates = req.body; // [{_id, fatherPhone, motherPhone}, ...]
    for (let u of updates) {
      await Student.findByIdAndUpdate(u._id, {
        fatherPhone: u.fatherPhone,
        motherPhone: u.motherPhone
      });
    }
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật' });
  }
};
