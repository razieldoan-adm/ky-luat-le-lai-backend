const AcademicWeek = require('../models/AcademicWeek');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * =========================================================
 * TẠO DANH SÁCH TUẦN
 *
 * Cơ chế:
 *
 * Admin chọn:
 * - ngày bắt đầu tuần 1
 * - ngày kết thúc năm học
 *
 * Tuần 1:
 *   ngày bắt đầu đã chọn -> Chủ nhật
 *
 * Từ tuần 2 trở đi:
 *   Thứ 2 -> Chủ nhật
 *
 * Ví dụ:
 *
 * Chọn 20/08/2026 (Thứ 5)
 *
 * Tuần 1: 20/08 -> 23/08
 * Tuần 2: 24/08 -> 30/08
 * Tuần 3: 31/08 -> 06/09
 * ...
 *
 * KHÔNG phụ thuộc SettingTime.
 * =========================================================
 */
exports.generateWeeks = async (req, res) => {
  try {
    const { startDate, endDate, academicYear } = req.body;
    // -------------------------------------------------------
    // KIỂM TRA INPUT
    // -------------------------------------------------------

    if (!startDate) {
      return res.status(400).json({
        message: 'Vui lòng chọn ngày bắt đầu tuần 1',
      });
    }

    if (!endDate) {
      return res.status(400).json({
        message: 'Vui lòng chọn ngày kết thúc năm học',
      });
    }
    if (!academicYear) {
      return res.status(400).json({
        message: 'Vui lòng chọn năm học',
      });
    }
    const start = dayjs
      .tz(startDate, VN_TIMEZONE)
      .startOf('day');

    const end = dayjs
      .tz(endDate, VN_TIMEZONE)
      .endOf('day');

    if (!start.isValid()) {
      return res.status(400).json({
        message: 'Ngày bắt đầu không hợp lệ',
      });
    }

    if (!end.isValid()) {
      return res.status(400).json({
        message: 'Ngày kết thúc không hợp lệ',
      });
    }

    // -------------------------------------------------------
    // NGÀY BẮT ĐẦU KHÔNG ĐƯỢC LỚN HƠN NGÀY KẾT THÚC
    // -------------------------------------------------------

    if (start.isAfter(end)) {
      return res.status(400).json({
        message:
          'Ngày bắt đầu không được lớn hơn ngày kết thúc năm học',
      });
    }

    // -------------------------------------------------------
    // TẠO TUẦN
    // -------------------------------------------------------

    const weeks = [];

    let currentStart = start;

    let firstWeek = true;

    while (
      currentStart.isBefore(end) ||
      currentStart.isSame(end, 'day')
    ) {
      let currentEnd;

      if (firstWeek) {
        // -----------------------------------------------
        // TUẦN 1:
        // ngày bắt đầu được chọn -> Chủ nhật
        // -----------------------------------------------

        const dayOfWeek = currentStart.day();

        // dayjs:
        // Chủ nhật = 0
        // Thứ 2 = 1
        // ...
        // Thứ 7 = 6

        const daysUntilSunday =
          dayOfWeek === 0
            ? 0
            : 7 - dayOfWeek;

        currentEnd = currentStart
          .add(daysUntilSunday, 'day')
          .endOf('day');

        firstWeek = false;
      } else {
        // -----------------------------------------------
        // TỪ TUẦN 2:
        // Thứ 2 -> Chủ nhật
        // -----------------------------------------------

        currentEnd = currentStart
          .add(6, 'day')
          .endOf('day');
      }

      // Không vượt quá ngày kết thúc năm học
      if (currentEnd.isAfter(end)) {
        currentEnd = end;
      }

      weeks.push({
        startDate: currentStart.toDate(),
        endDate: currentEnd.toDate(),
        academicYear,

        // Ban đầu chưa chọn tuần học
        weekNumber: null,
        isStudyWeek: false,
      });

      // -----------------------------------------------
      // TUẦN TIẾP THEO
      // -----------------------------------------------

      currentStart = currentEnd
        .add(1, 'millisecond')
        .startOf('day');
    }

    // -------------------------------------------------------
    // XÓA DANH SÁCH CŨ
    // -------------------------------------------------------

    await AcademicWeek.deleteMany({});

    // -------------------------------------------------------
    // INSERT DANH SÁCH MỚI
    // -------------------------------------------------------

    const createdWeeks =
      await AcademicWeek.insertMany(weeks);

    return res.json({
      message: `Đã tạo ${createdWeeks.length} tuần`,
      weeks: createdWeeks,
    });
  } catch (err) {
    console.error('Lỗi generateWeeks:', err);

    return res.status(500).json({
      message: 'Lỗi server khi tạo danh sách tuần',
    });
  }
};

/**
 * =========================================================
 * GET ALL WEEKS
 * =========================================================
 */
exports.getWeeks = async (req, res) => {
  try {
    const weeks = await AcademicWeek
      .find()
      .sort({ startDate: 1 });

    res.json(weeks);
  } catch (err) {
    console.error('Lỗi getWeeks:', err);

    res.status(500).json({
      message: 'Lỗi server',
    });
  }
};

/**
 * =========================================================
 * UPDATE TẤT CẢ TUẦN
 *
 * isStudyWeek = true
 *   -> tự đánh số tuần
 *
 * isStudyWeek = false
 *   -> weekNumber = null
 *
 * Đây chính là cơ chế cũ được giữ nguyên.
 * =========================================================
 */
exports.updateWeeksBulk = async (req, res) => {
  try {
    const updatedWeeks = Array.isArray(req.body)
      ? req.body
      : [];

    if (!updatedWeeks.length) {
      return res.status(400).json({
        message: 'Danh sách tuần không hợp lệ',
      });
    }

    // Lấy năm học từ tuần đầu tiên
    const academicYear = updatedWeeks[0]?.academicYear;

    if (!academicYear) {
      return res.status(400).json({
        message: 'Thiếu năm học',
      });
    }

    // Sắp xếp theo ngày bắt đầu
    const sortedWeeks = [...updatedWeeks].sort(
      (a, b) =>
        new Date(a.startDate).getTime() -
        new Date(b.startDate).getTime()
    );

    let weekNumberCounter = 1;

    const weeksToInsert = sortedWeeks.map((week) => {
      const isStudyWeek = Boolean(week.isStudyWeek);

      return {
        startDate: week.startDate,
        endDate: week.endDate,

        // QUAN TRỌNG
        academicYear,

        isStudyWeek,

        weekNumber: isStudyWeek
          ? weekNumberCounter++
          : null,
      };
    });
    console.log("UPDATED WEEKS:", JSON.stringify(req.body, null, 2));
    await AcademicWeek.deleteMany({});

    const savedWeeks = await AcademicWeek.insertMany(
      weeksToInsert
    );
    
    res.json({
      message: 'Đã lưu danh sách tuần mới',
      weeks: savedWeeks,
    });

  } catch (err) {
    console.error('Lỗi updateWeeksBulk:', err);

    res.status(500).json({
      message: 'Lỗi server khi lưu danh sách tuần',
    });
  }
};

/**
 * =========================================================
 * DELETE ALL
 * =========================================================
 */
exports.deleteAllWeeks = async (req, res) => {
  try {
    await AcademicWeek.deleteMany({});

    res.json({
      message: 'Đã xoá toàn bộ tuần',
    });
  } catch (err) {
    console.error(
      'Lỗi deleteAllWeeks:',
      err
    );

    res.status(500).json({
      message: 'Lỗi server',
    });
  }
};

/**
 * =========================================================
 * GET STUDY WEEKS
 * =========================================================
 */
exports.getStudyWeeks = async (req, res) => {
  try {
    const weeks = await AcademicWeek
      .find({
        isStudyWeek: true,
      })
      .sort({
        weekNumber: 1,
      });

    res.json(weeks);
  } catch (err) {
    console.error(
      'Lỗi getStudyWeeks:',
      err
    );

    res.status(500).json({
      message: 'Lỗi server',
    });
  }
};

/**
 * =========================================================
 * GET CURRENT STUDY WEEK
 * =========================================================
 */
exports.getCurrentStudyWeek = async (req, res) => {
  try {
    const todayVN = dayjs()
      .tz(VN_TIMEZONE);

    const currentWeek =
      await AcademicWeek.findOne({
        startDate: {
          $lte: todayVN.toDate(),
        },

        endDate: {
          $gte: todayVN.toDate(),
        },

        isStudyWeek: true,
      }).lean();

    if (!currentWeek) {
      return res.status(404).json({
        message:
          'Không tìm thấy tuần học hiện tại',
      });
    }

    res.json(currentWeek);
  } catch (err) {
    console.error(
      'Lỗi getCurrentStudyWeek:',
      err
    );

    res.status(500).json({
      error: 'Server error',
    });
  }
};
