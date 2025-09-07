const Rule = require('../models/Rule');
const xlsx = require('xlsx');

/**
 * Lấy toàn bộ rules
 */
exports.getAllRules = async (req, res) => {
  try {
    const rules = await Rule.find();
    res.json(rules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Tạo rule mới
 */
exports.createRule = async (req, res) => {
  try {
    const { title, point, content } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Missing title' });
    }

    const newRule = new Rule({ title, point, content });
    await newRule.save();
    res.json(newRule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Cập nhật rule theo ID
 */
exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, point, content } = req.body;

    const updated = await Rule.findByIdAndUpdate(
      id,
      { title, point, content },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Rule not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Xóa rule theo ID
 */
exports.deleteRule = async (req, res) => {
  try {
    const { id } = req.params;
    await Rule.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Import rules từ file Excel
 */
exports.importRules = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    console.log('DATA IMPORT:', data);

    const rules = data.reduce((acc, r, index) => {
      const title = r['NỘI DUNG'] || r['NOI DUNG'] || '';
      if (!title) {
        console.warn(`⚠️ Dòng ${index + 2} không có NỘI DUNG, bỏ qua`);
        return acc;
      }
      acc.push({
        title,
        point: parseInt(r['ĐIỂM TRỪ'] || r['DIEM TRU']) || 0,
        content: r['GHI CHÚ'] || r['GHI CHU'] || '',
      });
      return acc;
    }, []);

    if (!rules.length) {
      return res.status(400).json({ message: 'Không có dữ liệu hợp lệ để import' });
    }

    // 👉 Xóa dữ liệu cũ (nếu muốn reset toàn bộ trước khi import)
    await Rule.deleteMany({});
    await Rule.insertMany(rules);

    res.json({ message: 'Imported successfully', count: rules.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Import failed' });
  }
};
