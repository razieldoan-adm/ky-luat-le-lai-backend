const StudentMonthlyConduct =
  require("../models/StudentMonthlyConduct");

const StudentConductScore =
  require("../models/StudentConductScore");

const AcademicWeek =
  require("../models/AcademicWeek");
// =====================================================
// XẾP LOẠI NHIỀU TUẦN
// =====================================================

const getMonthClassification = (
  classifications
) => {
  const valid =
    classifications.filter(Boolean);

  if (!valid.length) return "";

  const good = valid.filter(
    (x) => x === "Tốt"
  ).length;

  const fairlyGood = valid.filter(
    (x) => x === "Khá"
  ).length;

  const pass = valid.filter(
    (x) => x === "Đạt"
  ).length;

  const notPass = valid.filter(
    (x) => x === "Chưa đạt"
  ).length;

  // TỐT
  if (
    good >= 3 &&
    notPass === 0
  ) {
    return "Tốt";
  }

  // KHÁ
  if (
    notPass === 0 &&
    (good >= 1 ||
      fairlyGood >= 3)
  ) {
    return "Khá";
  }

  // ĐẠT
  if (
    good === 0 &&
    fairlyGood === 0 &&
    (
      pass >= 3 ||
      (pass >= 2 &&
        notPass >= 1)
    )
  ) {
    return "Đạt";
  }

  return "Chưa đạt";
};

// =====================================================
// CHỐT THÁNG CHO TOÀN TRƯỜNG
// =====================================================

exports.finalizeMonth = async (
  req,
  res
) => {
  try {
    const {
      academicYear,
      month,
      year,
    } = req.body;

    // =====================================================
    // KIỂM TRA DỮ LIỆU
    // =====================================================

    if (
      !academicYear ||
      !month ||
      !year
    ) {
      return res.status(400).json({
        message:
          "Thiếu academicYear, month hoặc year",
      });
    }

    const monthNumber =
      Number(month);

    const yearNumber =
      Number(year);

    if (
      !Number.isInteger(monthNumber) ||
      monthNumber < 1 ||
      monthNumber > 12 ||
      !Number.isInteger(yearNumber)
    ) {
      return res.status(400).json({
        message:
          "Tháng hoặc năm không hợp lệ",
      });
    }

    // =====================================================
    // 1. XÁC ĐỊNH CÁC TUẦN THUỘC THÁNG
    //
    // Quy tắc:
    // Tuần thuộc tháng dựa vào NGÀY BẮT ĐẦU của tuần.
    // Không chia tuần theo ngày.
    // =====================================================

    const academicWeeks =
      await AcademicWeek.find({
        academicYear,
        isStudyWeek: true,
        weekNumber: {
          $ne: null,
        },
      }).sort({
        weekNumber: 1,
      });

    const monthWeeks =
      academicWeeks.filter(
        (week) => {
          if (!week.startDate) {
            return false;
          }

          const startDate =
            new Date(
              week.startDate
            );

          if (
            Number.isNaN(
              startDate.getTime()
            )
          ) {
            return false;
          }

          return (
            startDate.getMonth() + 1 ===
              monthNumber &&
            startDate.getFullYear() ===
              yearNumber
          );
        }
      );

    const monthWeekNumbers =
      monthWeeks
        .map(
          (week) =>
            Number(
              week.weekNumber
            )
        )
        .filter(
          (weekNumber) =>
            Number.isInteger(
              weekNumber
            )
        );

    if (
      monthWeekNumbers.length === 0
    ) {
      return res.status(400).json({
        message:
          `Không tìm thấy tuần học nào thuộc tháng ${monthNumber}/${yearNumber}`,
      });
    }

    // =====================================================
    // 2. LẤY ĐIỂM HẠNH KIỂM TUẦN
    //    TOÀN TRƯỜNG
    //
    // Không lọc className.
    // =====================================================

    const weeklyScores =
      await StudentConductScore.find({
        academicYear,
        status: "FINAL",
        weekNumber: {
          $in:
            monthWeekNumbers,
        },
      }).sort({
        className: 1,
        name: 1,
        weekNumber: 1,
      });

    if (
      weeklyScores.length === 0
    ) {
      return res.status(400).json({
        message:
          `Chưa có điểm hạnh kiểm tuần FINAL cho tháng ${monthNumber}/${yearNumber}`,
      });
    }

    // =====================================================
    // 3. NHÓM THEO HỌC SINH + LỚP
    // =====================================================

    const studentMap =
      new Map();

    weeklyScores.forEach(
      (score) => {
        const key =
          `${score.className}__${score.name}`;

        if (
          !studentMap.has(key)
        ) {
          studentMap.set(
            key,
            []
          );
        }

        studentMap
          .get(key)
          .push(score);
      }
    );

    const results = [];

    // =====================================================
    // 4. TÍNH HẠNH KIỂM THÁNG
    // =====================================================

    for (
      const [
        key,
        scores,
      ] of studentMap
    ) {
      const firstScore =
        scores[0];

      const name =
        firstScore.name;

      const className =
        firstScore.className;

      const classifications =
        scores.map(
          (score) => {
            const value =
              Number(
                score.finalScore
              );

            if (
              value >= 90
            ) {
              return "Tốt";
            }

            if (
              value >= 70
            ) {
              return "Khá";
            }

            if (
              value >= 50
            ) {
              return "Đạt";
            }

            return "Chưa đạt";
          }
        );

      // ===================================================
      // XẾP LOẠI THÁNG
      // ===================================================

      const classification =
        getMonthClassification(
          classifications
        );

      // ===================================================
      // ĐẾM XẾP LOẠI
      // ===================================================

      const counts = {
        tot: 0,
        kha: 0,
        dat: 0,
        chuaDat: 0,
      };

      classifications.forEach(
        (value) => {
          if (
            value === "Tốt"
          ) {
            counts.tot++;
          }

          if (
            value === "Khá"
          ) {
            counts.kha++;
          }

          if (
            value === "Đạt"
          ) {
            counts.dat++;
          }

          if (
            value === "Chưa đạt"
          ) {
            counts.chuaDat++;
          }
        }
      );

      // ===================================================
      // DANH SÁCH TUẦN ĐÃ CÓ ĐIỂM
      // ===================================================

      const weekNumbers =
        scores
          .map(
            (score) =>
              Number(
                score.weekNumber
              )
          )
          .filter(
            (weekNumber) =>
              Number.isInteger(
                weekNumber
              )
          )
          .sort(
            (a, b) =>
              a - b
          );

      // ===================================================
      // LƯU / CẬP NHẬT HẠNH KIỂM THÁNG
      // ===================================================

      const saved =
        await StudentMonthlyConduct.findOneAndUpdate(
          {
            name,
            className,
            academicYear,
            month:
              monthNumber,
            year:
              yearNumber,
          },
          {
            name,
            className,
            academicYear,

            month:
              monthNumber,

            year:
              yearNumber,

            weekNumbers,

            classificationCounts:
              counts,

            classification,

            status: "FINAL",

            finalizedAt:
              new Date(),
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
          }
        );

      results.push(saved);
    }

    // =====================================================
    // 5. TRẢ KẾT QUẢ TOÀN TRƯỜNG
    // =====================================================

    res.json({
      message:
        `Đã duyệt hạnh kiểm toàn trường tháng ${monthNumber}/${yearNumber}`,
      month:
        monthNumber,
      year:
        yearNumber,
      weekNumbers:
        monthWeekNumbers,
      studentCount:
        results.length,
      data:
        results,
    });

  } catch (err) {
    console.error(
      "finalizeMonth error:",
      err
    );

    res.status(500).json({
      message:
        "Server error",
      error:
        err.message,
    });
  }
};


// =====================================================
// LẤY HẠNH KIỂM THÁNG
// =====================================================

exports.getMonthlyConduct =
  async (req, res) => {
    try {
      const {
        academicYear,
        month,
        year,
        className,
      } = req.query;

      const filter = {};

      if (academicYear) {
        filter.academicYear =
          academicYear;
      }

      if (month) {
        filter.month =
          Number(month);
      }

      if (year) {
        filter.year =
          Number(year);
      }

      if (className) {
        filter.className =
          className;
      }

      const data =
        await StudentMonthlyConduct.find(
          filter
        ).sort({
          className: 1,
          name: 1,
        });

      res.json(data);
    } catch (err) {
      console.error(
        "getMonthlyConduct error:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  };
