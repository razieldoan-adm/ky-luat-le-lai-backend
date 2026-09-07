// controllers/studentController.js
const Student = require('../models/Student');
const XLSX = require('xlsx');
const fs = require('fs');

const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9\s]/g, "");
};

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
      // Lấy tên linh hoạt (Họ tên hoặc Tên)
      const name = (r['Tên học sinh'] || r['Họ tên'] || r['Tên'] || '').toString().trim();
      const className = (r['Lớp'] || '').trim();

      // Bỏ qua dòng trống
      if (!name || !className) continue;

      // Lấy SĐT nếu có
      const fatherPhone = (r['SĐT Ba'] || '').trim();
      const motherPhone = (r['SĐT Mẹ'] || '').trim();

      // Tạo normalizedName (tên không dấu, chữ thường)
      const normalizedName = removeVietnameseTones(name).toLowerCase();

      // Cập nhật hoặc thêm mới (upsert)
      await Student.findOneAndUpdate(
        { name, className },
        {
          name,
          className,
          fatherPhone,
          motherPhone,
          normalizedName
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
// GET /api/students/search?name=abc
// controllers/studentController.js

exports.searchStudents = async (req, res) => {
  try {
    const name = req.query.name?.trim() || '';
    const className = req.query.className?.trim() || '';

    // Nếu không có tên và cũng không có className thì trả về rỗng
    if (!name && !className) return res.json([]);

    let filter = {};

    if (name) {
      // regex cho tên có dấu
      const regex = new RegExp(name, 'i');

      // regex cho tên không dấu
      const noAccent = removeVietnameseTones(name);
      const noAccentRegex = new RegExp(noAccent, 'i');

      filter.$or = [
        { name: regex },                  // so khớp tên gốc
        { normalizedName: noAccentRegex } // so khớp tên không dấu
      ];
    }

    if (className) {
      filter.className = className;
    }

    const students = await Student.find(filter).limit(100);
    res.json(students);
  } catch (err) {
    console.error('Lỗi searchStudents:', err);
    res.status(500).json({ error: 'Lỗi tìm kiếm học sinh' });
  }
};
