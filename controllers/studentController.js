// controllers/studentController.js
const Student = require('../models/Student');
const XLSX = require('xlsx');
const fs = require('fs');

// 📌 Import danh sách học sinh từ Excel
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file Excel' });
    }

    // Đọc file Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Xóa file sau khi đọc xong (tránh rác)
    fs.unlinkSync(req.file.path);

    let imported = 0;
    for (const r of rows) {
      if (!r['Họ tên'] || !r['Lớp']) continue;

      // Cập nhật hoặc thêm mới (giữ nguyên số điện thoại cũ nếu có)
      await Student.findOneAndUpdate(
        { name: r['Tên'], className: r['Lớp'] },
        { 
          name: r['Tên'], 
          className: r['Lớp'],
          fatherPhone: '', // rỗng nếu Excel không có
          motherPhone: ''
        },
        { upsert: true, new: true }
      );


      imported++;
    }

    res.json({ message: 'Import thành công', count: imported });
  } catch (err) {
    console.error('Lỗi import Excel:', err);
    res.status(500).json({ error: 'Lỗi import' });
  }
};

// 📌 Lấy danh sách học sinh theo lớp
exports.getByClass = async (req, res) => {
  try {
    const { className } = req.query;
    const filter = className ? { className } : {};
    const students = await Student.find(filter).sort({ name: 1 }); // sắp xếp theo tên
    res.json(students);
  } catch (err) {
    console.error('Lỗi getByClass:', err);
    res.status(500).json({ error: 'Lỗi lấy danh sách' });
  }
};

// 📌 Cập nhật số điện thoại cha mẹ
exports.updatePhones = async (req, res) => {
  try {
    const updates = req.body; // [{_id, fatherPhone, motherPhone}, ...]

    for (let u of updates) {
      await Student.findByIdAndUpdate(u._id, {
        fatherPhone: u.fatherPhone || "",
        motherPhone: u.motherPhone || ""
      });
    }

    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('Lỗi updatePhones:', err);
    res.status(500).json({ error: 'Lỗi cập nhật' });
  }
};
