const ClassLineUpSummary = require('../models/ClassLineUpSummary');
const Setting = require('../models/Setting');
const AcademicWeek = require('../models/AcademicWeek');
const Class = require('../models/Class');

// ✅ Ghi nhận lỗi xếp hàng
exports.createRecord = async (req, res) => {
  try {
    // 🔹 Lấy điểm trừ mặc định từ settings
    const setting = await Setting.findOne();
    const defaultScore = setting?.lineUpScore || 10; // nếu chưa cấu hình thì mặc định 10

    // 🔹 Tạo mới bản ghi lỗi
    const record = new ClassLineUpSummary({
      ...req.body,
      scoreChange: -Math.abs(defaultScore), // luôn là điểm âm
    });

    await record.save();

    // 🔹 (Tuỳ chọn) cập nhật tổng điểm xếp hạng của lớp trong tuần
    const classInfo = await Class.findOne({ name: req.body.className });
    if (classInfo) {
      const currentWeek = await AcademicWeek.findOne({ isCurrent: true });
      if (currentWeek) {
        // Có thể thêm phần cộng/trừ điểm xếp hạng tại đây
        // Ví dụ:
        // await ClassViolationScore.findOneAndUpdate(
        //   { classId: classInfo._id, weekId: currentWeek._id },
        //   { $inc: { lineupScore: record.scoreChange } },
        //   { upsert: true, new: true }
        // );
      }
    }

    res.status(201).json(record);
  } catch (err) {
    console.error('❌ Lỗi ghi nhận:', err);
    res.status(500).json({ message: 'Không thể ghi nhận vi phạm' });
  }
};

// ✅ Lấy danh sách lỗi (lọc theo tuần hoặc toàn bộ)
exports.getRecords = async (req, res) => {
  try {
    const { filter } = req.query; // filter = 'week' hoặc 'all'
    let records = [];

    if (filter === 'week') {
      // 🔹 Xác định thứ Hai và Chủ nhật tuần hiện tại
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      records = await ClassLineUpSummary.find({
        date: { $gte: monday, $lte: sunday },
      }).sort({ date: -1 });
    } else {
      records = await ClassLineUpSummary.find().sort({ date: -1 });
    }

    res.json(records);
  } catch (err) {
    console.error('❌ Lỗi khi lấy danh sách:', err);
    res.status(500).json({ message: 'Không thể tải dữ liệu' });
  }
};

// ✅ Xóa lỗi
exports.deleteRecord = async (req, res) => {
  try {
    const record = await ClassLineUpSummary.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Không tìm thấy vi phạm' });
    }

    res.json({ message: 'Đã xóa vi phạm', deleted: record });
  } catch (err) {
    console.error('❌ Lỗi khi xóa:', err);
    res.status(500).json({ message: 'Không thể xóa vi phạm' });
  }
};
