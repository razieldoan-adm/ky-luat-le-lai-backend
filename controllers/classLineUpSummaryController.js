// controllers/classLineUpSummaryController.js
const ClassLineUpSummary = require('../models/ClassLineUpSummary');
const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const moment = require('moment');

// 🔹 Ghi nhận lỗi xếp hàng
exports.recordViolation = async (req, res) => {
  try {
    const { className, date, session, violation, studentName, note, recorder } = req.body;
    const currentDate = date ? new Date(date) : new Date();

    let sessionValue = session;
    if (!sessionValue) {
      const hour = currentDate.getHours();
      if (hour >= 7 && hour < 11) sessionValue = 'Sáng';
      else if (hour >= 13 && hour < 17) sessionValue = 'Chiều';
      else sessionValue = 'Khác';
    }

    const newRecord = new ClassLineUpSummary({
      className,
      date: currentDate,
      session: sessionValue,
      violation: violation || 'Không xếp hàng',
      studentName,
      note,
      recorder,
      minusPoint: 10,
    });
    await newRecord.save();

    // Cập nhật điểm xếp hàng trong tổng kết tuần
    const weekNumber = moment(currentDate).week();
    const year = moment(currentDate).year();

    await ClassWeeklyScore.findOneAndUpdate(
      { className, weekNumber },
      { $inc: { lineUpScore: 10 }, $setOnInsert: { grade: '', lastUpdated: new Date() } },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Ghi nhận thành công', data: newRecord });
  } catch (error) {
    console.error('recordViolation error:', error);
    res.status(500).json({ message: 'Lỗi khi ghi nhận vi phạm' });
  }
};

// 🔹 Lấy danh sách lỗi theo ngày hoặc tuần
exports.getViolations = async (req, res) => {
  try {
    const { date, week } = req.query;
    let filter = {};

    if (date) {
      const start = moment(date).startOf('day');
      const end = moment(date).endOf('day');
      filter.date = { $gte: start, $lte: end };
    } else if (week) {
      const start = moment().week(week).startOf('week');
      const end = moment().week(week).endOf('week');
      filter.date = { $gte: start, $lte: end };
    }

    const records = await ClassLineUpSummary.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    console.error('getViolations error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách vi phạm' });
  }
};

// 🔹 Xóa ghi nhận
exports.deleteViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await ClassLineUpSummary.findById(id);
    if (!record) return res.status(404).json({ message: 'Không tìm thấy bản ghi' });

    await ClassLineUpSummary.findByIdAndDelete(id);

    const weekNumber = moment(record.date).week();

    await ClassWeeklyScore.findOneAndUpdate(
      { className: record.className, weekNumber },
      { $inc: { lineUpScore: -10 } }
    );

    res.json({ message: 'Xóa thành công' });
  } catch (error) {
    console.error('deleteViolation error:', error);
    res.status(500).json({ message: 'Lỗi khi xóa vi phạm' });
  }
};

// 🔹 Tổng hợp điểm xếp hàng theo tuần
exports.getWeeklyScores = async (req, res) => {
  try {
    const { week } = req.query;
    const weekNumber = week ? parseInt(week) : moment().week();

    const summaries = await ClassWeeklyScore.find({ weekNumber })
      .select('className grade lineUpScore totalScore')
      .sort({ lineUpScore: -1 });

    res.json(summaries);
  } catch (error) {
    console.error('getWeeklyScores error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy tổng điểm tuần' });
  }
};
