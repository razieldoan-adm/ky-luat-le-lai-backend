// controllers/classLineUpSummaryController.js
const ClassLineUpSummary = require('../models/ClassLineUpSummary');
const Setting = require('../models/Setting');

// Helper: lấy điểm mặc định (thử nhiều tên trường trong Setting, fallback = 10)
function getDefaultPenalty(setting) {
  if (!setting) return 10;
  return setting.defaultLineUpPenalty
    ?? setting.defaultViolationScore
    ?? setting.lineUpScore
    ?? 10;
}

// 🔹 Ghi nhận lỗi xếp hàng
exports.createRecord = async (req, res) => {
  try {
    const { className, studentName, violation, date, recorder } = req.body;

    // Lấy setting (nếu có)
    const setting = await Setting.findOne();
    const defaultPenalty = getDefaultPenalty(setting);

    const record = new ClassLineUpSummary({
      className,
      studentName: studentName || '',
      violation,
      date: date ? new Date(date) : new Date(),
      recorder: recorder || 'Giám Thị',
      // Lưu số điểm dưới dạng dương hoặc âm tùy bạn; ở UI ta hiển thị '-' nếu cần.
      scoreChange: defaultPenalty, 
    });

    await record.save();
    return res.status(201).json(record);
  } catch (err) {
    console.error('createRecord error:', err);
    return res.status(500).json({ message: 'Không thể ghi nhận vi phạm' });
  }
};

// 🔹 Lấy danh sách vi phạm trong tuần hiện tại (Tuần: Thứ 2 -> CN)
exports.getWeeklySummary = async (req, res) => {
  try {
    // Tính Monday và Sunday của tuần chứa ngày hiện tại
    const today = new Date();
    const day = today.getDay(); // 0..6 (0 = Sun)
    // tính thứ Hai: nếu sunday (0) thì monday = today -6
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const records = await ClassLineUpSummary.find({
      date: { $gte: monday, $lte: sunday },
    }).sort({ date: -1 });

    return res.json(records);
  } catch (err) {
    console.error('getWeeklySummary error:', err);
    return res.status(500).json({ message: 'Lỗi khi lấy dữ liệu tuần' });
  }
};

// 🔹 Lấy tất cả bản ghi (nếu cần) — giữ cho tương thích
exports.getAllRecords = async (req, res) => {
  try {
    const records = await ClassLineUpSummary.find().sort({ date: -1 });
    return res.json(records);
  } catch (err) {
    console.error('getAllRecords error:', err);
    return res.status(500).json({ message: 'Lỗi khi lấy danh sách' });
  }
};

// 🔹 Xóa vi phạm
exports.deleteRecord = async (req, res) => {
  try {
    const id = req.params.id;
    const record = await ClassLineUpSummary.findByIdAndDelete(id);
    if (!record) return res.status(404).json({ message: 'Không tìm thấy vi phạm' });
    return res.json({ message: 'Đã xóa vi phạm', deleted: record });
  } catch (err) {
    console.error('deleteRecord error:', err);
    return res.status(500).json({ message: 'Không thể xóa vi phạm' });
  }
};
