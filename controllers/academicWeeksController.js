const AcademicWeek = require('../models/AcademicWeek');
const SettingTime = require('../models/SettingTime');

const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
const weekday = require('dayjs/plugin/weekday');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// 👉 Kích hoạt plugin timezone toàn cục
dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Ho_Chi_Minh');

/**
 * Generate weeks based on SettingTime start & end
 */
exports.generateWeeks = async (req, res) => {
  try {
    const setting = await SettingTime.findOne();
    if (!setting) {
      return res.status(400).json({ message: '⚠️ Chưa cấu hình ngày bắt đầu / kết thúc năm học' });
    }

    // 🔹 Lấy thời gian bắt đầu / kết thúc theo múi giờ VN
    const start = dayjs(setting.startSchoolYear).tz('Asia/Ho_Chi_Minh').startOf('day');
    const end = dayjs(setting.endSchoolYear).tz('Asia/Ho_Chi_Minh').endOf('day');

    let weeks = [];
    let current = start.startOf('week').add(1, 'day'); // ép về Thứ 2 tuần đầu tiên

    while (current.isBefore(end)) {
      // Ngày bắt đầu tuần (Thứ 2)
      const monday = current.startOf('day');
      // Ngày kết thúc tuần (Chủ nhật)
      let sunday = monday.add(6, 'day').endOf('day');

      if (sunday.isAfter(end)) sunday = end;

      weeks.push({
        startDate: monday.toDate(),
        endDate: sunday.toDate(),
        isStudyWeek: false,
      });

      // Sang tuần tiếp theo
      current = monday.add(7, 'day');
    }

    // 🔄 Ghi lại dữ liệu vào MongoDB
    await AcademicWeek.deleteMany({});
    await AcademicWeek.insertMany(weeks);

    res.json({
      message: `✅ Đã tạo ${weeks.length} tuần học (theo múi giờ Việt Nam)`,
      weeks,
    });
  } catch (err) {
    console.error('❌ Lỗi generateWeeks:', err);
    res.status(500).json({ message: 'Lỗi server khi tạo danh sách tuần.' });
  }
};

/**
 * Get all weeks
 */
exports.getWeeks = async (req, res) => {
  try {
    const weeks = await AcademicWeek.find().sort('startDate');
    res.json(weeks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Bulk update weeks
 */
exports.updateWeeksBulk = async (req, res) => {
  try {
    const updatedWeeks = req.body;

    await AcademicWeek.deleteMany({});

    let weekNumberCounter = 1;
    const weeksToInsert = updatedWeeks.map((week) => {
      const newWeek = {
        startDate: week.startDate,
        endDate: week.endDate,
        isStudyWeek: week.isStudyWeek
      };

      if (week.isStudyWeek) {
        newWeek.weekNumber = weekNumberCounter++;
      } else {
        newWeek.weekNumber = null;
      }

      return newWeek;
    });

    await AcademicWeek.insertMany(weeksToInsert);

    res.json({ message: 'Đã lưu danh sách tuần mới', weeks: weeksToInsert });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Delete all weeks
 */
exports.deleteAllWeeks = async (req, res) => {
  try {
    await AcademicWeek.deleteMany({});
    res.json({ message: 'Đã xoá toàn bộ tuần' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Get study weeks
 */
exports.getStudyWeeks = async (req, res) => {
  try {
    const weeks = await AcademicWeek.find({ isStudyWeek: true }).sort('weekNumber');
    res.json(weeks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Get current study week (the week where today is between startDate and endDate)
 */
exports.getCurrentStudyWeek = async (req, res) => {
  try {
    // ✅ Lấy đúng ngày theo múi giờ VN
    const todayVN = dayjs().tz('Asia/Ho_Chi_Minh').toDate();

    const currentWeek = await AcademicWeek.findOne({
      startDate: { $lte: todayVN },
      endDate: { $gte: todayVN },
      isStudyWeek: true
    }).lean();

    if (!currentWeek) {
      return res.status(404).json({ message: 'Không tìm thấy tuần học hiện tại' });
    }

    res.json(currentWeek);
  } catch (err) {
    console.error('Lỗi getCurrentStudyWeek:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
