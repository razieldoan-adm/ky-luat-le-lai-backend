const Rule = require('../models/Rule');
const xlsx = require('xlsx');
const fs = require('fs');
exports.getAllRules = async (req, res) => {
  const rules = await Rule.find();
  res.json(rules);
};

exports.createRule = async (req, res) => {
  try {
    const { title, point, content } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'Missing required fields' });

    const newRule = new Rule({ title, point, content });
    await newRule.save();
    res.json(newRule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, point, content } = req.body;
    const updated = await Rule.findByIdAndUpdate(id, { title, point, content }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Rule not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.deleteRule = async (req, res) => {
  const { id } = req.params;
  await Rule.findByIdAndDelete(id);
  res.json({ message: 'Deleted' });
};

exports.importRules = async (req, res) => {
  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  console.log("DATA IMPORT:", data); // 👈 log toàn bộ data

const rules = data.reduce((acc, r, index) => {
  const title = r['NỘI DUNG'] || r['NOI DUNG'] || '';
  if (!title) {
    console.warn(`⚠️ Dòng ${index + 2} không có NỘI DUNG, bỏ qua`);
    return acc;
  }
  acc.push({
    stt: r['STT'] || null,
    title,
    point: parseInt(r['ĐIỂM TRỪ']) || 0,
    content: r['GHI CHÚ'] || '',
  });
  return acc;
}, []);

  await Rule.insertMany(rules);
  res.json({ message: 'Imported successfully', count: rules.length });
};

