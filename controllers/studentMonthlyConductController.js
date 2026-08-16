const StudentMonthlyConduct =
  require("../models/StudentMonthlyConduct");

const StudentConductScore =
  require("../models/StudentConductScore");

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
// CHỐT THÁNG CHO 1 LỚP
// =====================================================

exports.finalizeMonth = async (
  req,
  res
) => {
  try {
    const {
      className,
      academicYear,
      month,
      year,
    } = req.body;

    if (
      !className ||
      !academicYear ||
      !month ||
      !year
    ) {
      return res.status(400).json({
        message:
          "Thiếu className, academicYear, month hoặc year",
      });
    }

    const monthNumber =
      Number(month);

    const yearNumber =
      Number(year);

    // ---------------------------------------------
    // LẤY TOÀN BỘ ĐIỂM TUẦN CỦA LỚP
    // ---------------------------------------------

    const weeklyScores =
      await StudentConductScore.find({
        className,
        academicYear,
        status: "FINAL",
      }).sort({
        name: 1,
        weekNumber: 1,
      });

    // ---------------------------------------------
    // NHÓM THEO HỌC SINH
    // ---------------------------------------------

    const studentMap =
      new Map();

    weeklyScores.forEach(
      (score) => {
        if (
          !studentMap.has(
            score.name
          )
        ) {
          studentMap.set(
            score.name,
            []
          );
        }

        studentMap
          .get(score.name)
          .push(score);
      }
    );

    const results = [];

    // ---------------------------------------------
    // TÍNH HẠNH KIỂM THÁNG
    // ---------------------------------------------

    for (
      const [
        name,
        scores,
      ] of studentMap
    ) {
      const monthScores =
        scores.filter(
          (score) => {
            const createdDate =
              score.createdAt;

            if (!createdDate) {
              return false;
            }

            const date =
              new Date(
                createdDate
              );

            return (
              date.getMonth() + 1 ===
                monthNumber &&
              date.getFullYear() ===
                yearNumber
            );
          }
        );

      const classifications =
        monthScores.map(
          (score) => {
            const value =
              score.finalScore;

            if (
              value >= 90
            )
              return "Tốt";

            if (
              value >= 70
            )
              return "Khá";

            if (
              value >= 50
            )
              return "Đạt";

            return "Chưa đạt";
          }
        );

      const classification =
        getMonthClassification(
          classifications
        );

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
          )
            counts.tot++;

          if (
            value === "Khá"
          )
            counts.kha++;

          if (
            value === "Đạt"
          )
            counts.dat++;

          if (
            value === "Chưa đạt"
          )
            counts.chuaDat++;
        }
      );

      const weekNumbers =
        monthScores.map(
          (score) =>
            score.weekNumber
        );

      const saved =
        await StudentMonthlyConduct.findOneAndUpdate(
          {
            name,
            className,
            academicYear,
            month: monthNumber,
            year: yearNumber,
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

    res.json({
      message:
        `Đã chốt hạnh kiểm tháng ${monthNumber}/${yearNumber} cho lớp ${className}`,
      count:
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
