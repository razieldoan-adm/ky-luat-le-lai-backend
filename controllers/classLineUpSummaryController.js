
const ClassLineUpSummary = require('../models/ClassLineUpSummary');
const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const AcademicWeek = require('../models/AcademicWeek');

// Hàm tìm tuần học hiện tại dựa trên ngày
async function findCurrentWeek(date) {
  const targetDate = new Date(date);
  const weeks = await AcademicWeek.find();

  return (
    weeks.find(
      (w) =>
        new Date(w.startDate) <= targetDate && targetDate <= new Date(w.endDate)
    ) || null
  );
}

// ✅ Ghi nhận điểm xếp hàng (thêm bản ghi)
exports.recordViolation = async (req, res) => {
  try {
    const { className, grade, date, scoreChange } = req.body;

    const currentDate = date ? new Date(date) : new Date();
    const currentWeek = await findCurrentWeek(currentDate);

    if (!currentWeek)
      return res.status(404).json({ message: 'Không tìm thấy tuần học hiện tại.' });

    const weekNumber = currentWeek.weekNumber;

    // Lưu bản ghi xếp hàng
    const record = new ClassLineUpSummary({
      className,
      grade,
      date: currentDate,
      scoreChange,
      weekNumber,
    });
    await record.save();

    // Cập nhật điểm trong ClassWeeklyScore
    const weekly = await ClassWeeklyScore.findOneAndUpdate(
      { className, weekNumber },
      { $inc: { lineUpScore: scoreChange } },
      { new: true, upsert: true }
    );

    res.json({ message: 'Ghi nhận thành công', weekly });
  } catch (error) {
    console.error('recordViolation error:', error);
    res.status(500).json({ message: 'Lỗi khi ghi nhận xếp hàng' });
  }
};

// ✅ Lấy danh sách bản ghi xếp hàng theo ngày hoặc tuần
exports.getViolations = async (req, res) => {
  try {
    const { date, week } = req.query;
    const filter = {};

    if (date) {
      const day = new Date(date);
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (week) {
      const targetWeek = await AcademicWeek.findOne({ weekNumber: Number(week) });
      if (targetWeek) {
        filter.date = {
          $gte: new Date(targetWeek.startDate),
          $lte: new Date(targetWeek.endDate),
        };
      }
    }

    const records = await ClassLineUpSummary.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    console.error('getViolations error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách xếp hàng' });
  }
};

// ✅ Xóa bản ghi và trừ điểm tương ứng
exports.deleteViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await ClassLineUpSummary.findById(id);
    if (!record)
      return res.status(404).json({ message: 'Không tìm thấy bản ghi.' });

    const currentWeek = await findCurrentWeek(record.date);
    if (!currentWeek)
      return res.status(404).json({ message: 'Không tìm thấy tuần học.' });

    await ClassWeeklyScore.findOneAndUpdate(
      { className: record.className, weekNumber: currentWeek.weekNumber },
      { $inc: { lineUpScore: -record.scoreChange } }
    );

    await record.deleteOne();
    res.json({ message: 'Đã xóa bản ghi thành công.' });
  } catch (error) {
    console.error('deleteViolation error:', error);
    res.status(500).json({ message: 'Lỗi khi xóa bản ghi.' });
  }
};

// ✅ Lấy điểm xếp hàng trong tuần (để render tổng hợp)
exports.getWeeklyScores = async (req, res) => {
  try {
    const { week } = req.query;
    let targetWeek = week
      ? await AcademicWeek.findOne({ weekNumber: Number(week) })
      : await findCurrentWeek(new Date());

    if (!targetWeek)
      return res.status(404).json({ message: 'Không tìm thấy tuần học.' });

    const scores = await ClassWeeklyScore.find({
      weekNumber: targetWeek.weekNumber,
    });

    res.json(scores);
  } catch (error) {
    console.error('getWeeklyScores error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy điểm xếp hàng.' });
  }
};

