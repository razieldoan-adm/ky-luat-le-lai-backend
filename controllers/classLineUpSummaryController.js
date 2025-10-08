const ClassLineUpSummary = require('../models/ClassLineUpSummary');
const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const moment = require('moment');

// 🔹 Ghi nhận lỗi xếp hàng
exports.recordViolation = async (req, res) => {
  try {
    const { className, date, session, violation, studentName, note, recorder } = req.body;
    const currentDate = date ? new Date(date) : new Date();

    // Xác định buổi
    let sessionValue = session;
    if (!sessionValue) {
      const hour = currentDate.getHours();
      if (hour >= 7 && hour < 11) sessionValue = 'Sáng';
      else if (hour >= 13 && hour < 17) sessionValue = 'Chiều';
      else sessionValue = 'Khác';
    }

    // Lưu vi phạm xếp hàng
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

    // Xác định tuần và năm
    const weekNumber = moment(currentDate).week();
    const year = moment(currentDate).year();

    // Cộng dồn điểm xếp hàng (mỗi lỗi +10)
    await ClassWeeklyScore.findOneAndUpdate(
      { className, weekNumber },
      {
        $inc: { lineUpScore: 10 },
        $setOnInsert: { grade: '', year, lastUpdated: new Date() },
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Ghi nhận thành công', data: newRecord });
  } catch (error) {
    console.error('recordViolation error:', error);
    res.status(500).json({ message: 'Lỗi khi ghi nhận vi phạm' });
  }
};

// 🔹 Lấy danh sách lỗi theo ngày hoặc tuần
// ✅ Không dùng moment nữa
exports.getViolations = async (req, res) => {
  try {
    const { date, week } = req.query;
    const filter = {};

    if (date) {
      // --- Lọc theo ngày cụ thể ---
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);

        const end = new Date(d);
        end.setHours(23, 59, 59, 999);

        filter.date = { $gte: start, $lte: end };
      }
    } else if (week) {
      // --- Lọc theo tuần học ---
      // Nếu bạn có collection AcademicWeek, nên dùng startDate/endDate trong đó để chính xác nhất.
      // Còn nếu chưa, ta tạm tính dựa theo tuần hiện tại như frontend.

      const year = new Date().getFullYear();
      const weekNum = parseInt(week);

      // Ngày đầu năm
      const jan1 = new Date(year, 0, 1);
      // Chuyển Sunday = 7, Monday = 1
      const jan1Day = jan1.getDay() === 0 ? 7 : jan1.getDay();

      // Tính offset tới đầu tuần cần tìm (Thứ 2)
      const start = new Date(jan1);
      start.setDate(jan1.getDate() - jan1Day + 1 + (weekNum - 1) * 7);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      filter.date = { $gte: start, $lte: end };
    }

    // --- Lấy dữ liệu ---
    const records = await ClassLineUpSummary.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    console.error("getViolations error:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách vi phạm" });
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

    // Khi xóa → trừ lại 10 điểm đã cộng
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
    const { week, year } = req.query;
    const weekNumber = week ? parseInt(week) : moment().week();
    const currentYear = year ? parseInt(year) : moment().year();

    const summaries = await ClassWeeklyScore.find({ weekNumber, year: currentYear })
      .select('className grade lineUpScore totalScore')
      .sort({ lineUpScore: -1 });

    res.json(summaries);
  } catch (error) {
    console.error('getWeeklyScores error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy tổng điểm tuần' });
  }
};
