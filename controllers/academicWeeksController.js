const AcademicWeek = require("../models/AcademicWeek");
const SettingTime = require("../models/SettingTime");

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

/**
 * =========================================================
 * TẠO DANH SÁCH TUẦN
 *
 * Quy tắc:
 *
 * Người dùng chọn ngày bất kỳ làm ngày đầu năm học.
 *
 * Ví dụ:
 * Chọn Thứ Năm 21/08/2026
 *
 * Tuần đầu:
 * 21/08/2026 -> 23/08/2026
 *
 * Tuần tiếp:
 * 24/08/2026 -> 30/08/2026
 *
 * Sau đó:
 * Thứ 2 -> Chủ nhật
 *
 * Lưu ý:
 * - Chưa đánh số tuần tại bước này.
 * - Tất cả tuần mới tạo đều isStudyWeek = false.
 * - Người dùng sẽ chọn tuần học bằng checkbox.
 * =========================================================
 */

exports.generateWeeks = async (req, res) => {
  try {
    const setting = await SettingTime.findOne();

    if (!setting) {
      return res.status(400).json({
        message:
          "⚠️ Chưa cấu hình ngày kết thúc năm học",
      });
    }

    /*
     * Ngày bắt đầu có thể được gửi từ frontend.
     *
     * Nếu không gửi thì dùng startSchoolYear
     * trong SettingTime.
     */
    const requestedStart =
      req.body?.startSchoolYear ||
      setting.startSchoolYear;

    if (!requestedStart) {
      return res.status(400).json({
        message:
          "⚠️ Vui lòng chọn ngày bắt đầu năm học",
      });
    }

    if (!setting.endSchoolYear) {
      return res.status(400).json({
        message:
          "⚠️ Chưa cấu hình ngày kết thúc năm học",
      });
    }

    /*
     * Parse ngày theo múi giờ Việt Nam.
     *
     * Dùng chuỗi YYYY-MM-DD để tránh trường hợp
     * trình duyệt/server tự chuyển ngày sang UTC
     * làm lệch ngày.
     */
    const start = dayjs
      .tz(
        String(requestedStart).slice(0, 10),
        VN_TIMEZONE
      )
      .startOf("day");

    const end = dayjs
      .tz(
        String(setting.endSchoolYear).slice(0, 10),
        VN_TIMEZONE
      )
      .endOf("day");

    if (!start.isValid()) {
      return res.status(400).json({
        message:
          "⚠️ Ngày bắt đầu năm học không hợp lệ",
      });
    }

    if (!end.isValid()) {
      return res.status(400).json({
        message:
          "⚠️ Ngày kết thúc năm học không hợp lệ",
      });
    }

    if (start.isAfter(end)) {
      return res.status(400).json({
        message:
          "⚠️ Ngày bắt đầu không được lớn hơn ngày kết thúc năm học",
      });
    }

    const weeks = [];

    /*
     * =======================================================
     * TUẦN 1
     * =======================================================
     *
     * Ngày bắt đầu chính là ngày người dùng chọn.
     *
     * Không ép ngày đó về Thứ 2.
     *
     * Tuần 1 kết thúc vào Chủ nhật.
     *
     * Dayjs:
     * day() = 0 -> Chủ nhật
     * day() = 1 -> Thứ 2
     * ...
     * day() = 6 -> Thứ 7
     */

    const firstDay = start.startOf("day");

    const daysUntilSunday =
      (7 - firstDay.day()) % 7;

    let firstSunday = firstDay
      .add(daysUntilSunday, "day")
      .endOf("day");

    /*
     * Nếu ngày kết thúc năm học nằm trước
     * Chủ nhật đầu tiên thì cắt tuần tại endSchoolYear.
     */
    if (firstSunday.isAfter(end)) {
      firstSunday = end;
    }

    weeks.push({
      startDate: firstDay.toDate(),
      endDate: firstSunday.toDate(),
      weekNumber: null,
      isStudyWeek: false,
    });

    /*
     * =======================================================
     * CÁC TUẦN TIẾP THEO
     * =======================================================
     *
     * Sau tuần đầu tiên:
     *
     * Thứ 2 -> Chủ nhật
     * Thứ 2 -> Chủ nhật
     * ...
     */

    let currentMonday =
      firstSunday
        .add(1, "day")
        .startOf("day");

    while (
      currentMonday.isBefore(end) ||
      currentMonday.isSame(end, "day")
    ) {
      const monday =
        currentMonday.startOf("day");

      let sunday = monday
        .add(6, "day")
        .endOf("day");

      /*
       * Nếu tuần cuối vượt quá ngày kết thúc
       * năm học thì cắt tại ngày kết thúc.
       */
      if (sunday.isAfter(end)) {
        sunday = end;
      }

      weeks.push({
        startDate: monday.toDate(),
        endDate: sunday.toDate(),
        weekNumber: null,
        isStudyWeek: false,
      });

      currentMonday = monday.add(7, "day");
    }

    /*
     * Xoá toàn bộ tuần cũ.
     *
     * Đây là hành vi giống controller cũ.
     */
    await AcademicWeek.deleteMany({});

    const insertedWeeks =
      await AcademicWeek.insertMany(weeks);

    return res.json({
      message: `✅ Đã tạo ${insertedWeeks.length} khoảng tuần`,
      weeks: insertedWeeks,
    });
  } catch (err) {
    console.error(
      "❌ Lỗi generateWeeks:",
      err
    );

    return res.status(500).json({
      message:
        "Lỗi server khi tạo danh sách tuần.",
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
    const weeks = await AcademicWeek.find().sort({
      startDate: 1,
    });

    res.json(weeks);
  } catch (err) {
    console.error(
      "❌ Lỗi getWeeks:",
      err
    );

    res.status(500).json({
      message: "Lỗi server",
    });
  }
};

/**
 * =========================================================
 * BULK UPDATE
 *
 * Chỉ những tuần:
 *
 * isStudyWeek = true
 *
 * mới được đánh số:
 *
 * 1, 2, 3, 4...
 *
 * Các tuần nghỉ:
 *
 * weekNumber = null
 * =========================================================
 */

exports.updateWeeksBulk = async (req, res) => {
  try {
    const updatedWeeks = Array.isArray(
      req.body
    )
      ? req.body
      : [];

    if (!updatedWeeks.length) {
      return res.status(400).json({
        message:
          "Danh sách tuần không hợp lệ",
      });
    }

    /*
     * Sắp xếp theo ngày bắt đầu.
     *
     * Điều này đảm bảo dù frontend gửi thứ tự
     * thế nào thì số tuần vẫn đúng thứ tự thời gian.
     */
    const sortedWeeks = [
      ...updatedWeeks,
    ].sort(
      (a, b) =>
        new Date(a.startDate).getTime() -
        new Date(b.startDate).getTime()
    );

    let weekNumberCounter = 1;

    const weeksToInsert =
      sortedWeeks.map((week) => {
        const isStudyWeek =
          Boolean(week.isStudyWeek);

        return {
          startDate: week.startDate,
          endDate: week.endDate,

          isStudyWeek,

          weekNumber: isStudyWeek
            ? weekNumberCounter++
            : null,
        };
      });

    /*
     * Xoá và ghi lại.
     */
    await AcademicWeek.deleteMany({});

    const insertedWeeks =
      await AcademicWeek.insertMany(
        weeksToInsert
      );

    return res.json({
      message:
        "Đã lưu danh sách tuần mới",
      weeks: insertedWeeks,
    });
  } catch (err) {
    console.error(
      "❌ Lỗi updateWeeksBulk:",
      err
    );

    res.status(500).json({
      message: "Lỗi server",
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
      message:
        "Đã xoá toàn bộ tuần",
    });
  } catch (err) {
    console.error(
      "❌ Lỗi deleteAllWeeks:",
      err
    );

    res.status(500).json({
      message: "Lỗi server",
    });
  }
};

/**
 * =========================================================
 * GET STUDY WEEKS
 *
 * Chỉ trả về các tuần đã tick:
 *
 * isStudyWeek = true
 *
 * và sắp xếp theo:
 *
 * weekNumber
 * =========================================================
 */

exports.getStudyWeeks = async (req, res) => {
  try {
    const weeks =
      await AcademicWeek.find({
        isStudyWeek: true,
      }).sort({
        weekNumber: 1,
      });

    res.json(weeks);
  } catch (err) {
    console.error(
      "❌ Lỗi getStudyWeeks:",
      err
    );

    res.status(500).json({
      message: "Lỗi server",
    });
  }
};

/**
 * =========================================================
 * GET CURRENT STUDY WEEK
 *
 * Tìm tuần học mà ngày hiện tại nằm trong đó.
 *
 * Chỉ xét:
 *
 * isStudyWeek = true
 * =========================================================
 */

exports.getCurrentStudyWeek = async (
  req,
  res
) => {
  try {
    const nowVN =
      dayjs()
        .tz(VN_TIMEZONE);

    const todayStart =
      nowVN.startOf("day").toDate();

    const todayEnd =
      nowVN.endOf("day").toDate();

    const currentWeek =
      await AcademicWeek.findOne({
        isStudyWeek: true,

        startDate: {
          $lte: todayEnd,
        },

        endDate: {
          $gte: todayStart,
        },
      }).sort({
        weekNumber: 1,
      });

    if (!currentWeek) {
      return res.status(404).json({
        message:
          "Không tìm thấy tuần học hiện tại",
      });
    }

    res.json(currentWeek);
  } catch (err) {
    console.error(
      "❌ Lỗi getCurrentStudyWeek:",
      err
    );

    res.status(500).json({
      error: "Server error",
    });
  }
};
