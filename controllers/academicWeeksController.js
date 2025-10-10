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
      return res.status(400).json({ message: 'Chưa cấu hình ngày bắt đầu/kết thúc năm học' });
    }

    const start = dayjs(setting.startSchoolYear);
    const end = dayjs(setting.endSchoolYear);

    let weeks = [];
    let current = start;

    while (current.isBefore(end)) {
      let friday = current.weekday(5);
      if (friday.isBefore(current, 'day')) {
        friday = friday.add(7, 'day');
      }

      let thursdayNextWeek = friday.add(6, 'day');
      if (thursdayNextWeek.isAfter(end)) {
        thursdayNextWeek = end;
      }

      weeks.push({
        startDate: friday.toDate(),
        endDate: thursdayNextWeek.toDate(),
        isStudyWeek: false
      });

      current = friday.add(7, 'day');
    }

    // Xoá hết tuần cũ và insert tuần mới
    await AcademicWeek.deleteMany({});
    await AcademicWeek.insertMany(weeks);

    res.json({ message: 'Đã tạo xong danh sách tuần', weeks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
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
