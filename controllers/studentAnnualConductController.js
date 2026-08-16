const StudentAnnualConduct =
  require("../models/StudentAnnualConduct");

const StudentMonthlyConduct =
  require("../models/StudentMonthlyConduct");

// =====================================================
// XẾP LOẠI NHIỀU THÁNG
// =====================================================

const getPeriodClassification = (
  classifications
) => {
  const valid =
    classifications.filter(Boolean);

  if (!valid.length) return "";

  const good =
    valid.filter(
      (x) => x === "Tốt"
    ).length;

  const fairlyGood =
    valid.filter(
      (x) => x === "Khá"
    ).length;

  const pass =
    valid.filter(
      (x) => x === "Đạt"
    ).length;

  const notPass =
    valid.filter(
      (x) => x === "Chưa đạt"
    ).length;

  if (
    good >= 3 &&
    notPass === 0
  ) {
    return "Tốt";
  }

  if (
    notPass === 0 &&
    (
      good >= 1 ||
      fairlyGood >= 3
    )
  ) {
    return "Khá";
  }

  if (
    good === 0 &&
    fairlyGood === 0 &&
    (
      pass >= 3 ||
      (
        pass >= 2 &&
        notPass >= 1
      )
    )
  ) {
    return "Đạt";
  }

  return "Chưa đạt";
};

// =====================================================
// CHỐT CẢ NĂM CHO 1 LỚP
// =====================================================

exports.finalizeAnnual =
  async (req, res) => {
    try {
      const {
        className,
        academicYear,
      } = req.body;

      if (
        !className ||
        !academicYear
      ) {
        return res.status(400).json({
          message:
            "Thiếu className hoặc academicYear",
        });
      }

      // ---------------------------------------------
      // CHỈ LẤY 9 THÁNG:
      // 9/2026 → 5/2027
      // ---------------------------------------------

      const monthly =
        await StudentMonthlyConduct.find({
          className,
          academicYear,
          status: "FINAL",
        }).sort({
          year: 1,
          month: 1,
          name: 1,
        });

      // ---------------------------------------------
      // NHÓM THEO HỌC SINH
      // ---------------------------------------------

      const studentMap =
        new Map();

      monthly.forEach(
        (item) => {
          if (
            !studentMap.has(
              item.name
            )
          ) {
            studentMap.set(
              item.name,
              []
            );
          }

          studentMap
            .get(item.name)
            .push(item);
        }
      );

      const results = [];

      for (
        const [
          name,
          months,
        ] of studentMap
      ) {
        // Chỉ 9 tháng học
        const validMonths =
          months.filter(
            (item) => {
              if (
                item.month >= 9 &&
                item.month <= 12
              ) {
                return true;
              }

              if (
                item.month >= 1 &&
                item.month <= 5
              ) {
                return true;
              }

              return false;
            }
          );

        const monthData =
          validMonths.map(
            (item) => ({
              month:
                item.month,

              year:
                item.year,

              classification:
                item.classification,
            })
          );

        const classification =
          getPeriodClassification(
            validMonths.map(
              (item) =>
                item.classification
            )
          );

        const saved =
          await StudentAnnualConduct.findOneAndUpdate(
            {
              name,
              className,
              academicYear,
            },
            {
              name,
              className,
              academicYear,

              months:
                monthData,

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
          `Đã chốt hạnh kiểm cả năm cho lớp ${className}`,
        count:
          results.length,
        data:
          results,
      });
    } catch (err) {
      console.error(
        "finalizeAnnual error:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  };

// =====================================================
// LẤY HẠNH KIỂM CẢ NĂM
// =====================================================

exports.getAnnualConduct =
  async (req, res) => {
    try {
      const {
        academicYear,
        className,
      } = req.query;

      const filter = {};

      if (academicYear) {
        filter.academicYear =
          academicYear;
      }

      if (className) {
        filter.className =
          className;
      }

      const data =
        await StudentAnnualConduct.find(
          filter
        ).sort({
          className: 1,
          name: 1,
        });

      res.json(data);
    } catch (err) {
      console.error(
        "getAnnualConduct error:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  };
