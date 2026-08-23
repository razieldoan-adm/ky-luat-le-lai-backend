const StudentConductScore = require('../models/StudentConductScore');
const Student = require('../models/Student');

/**
 * =====================================================
 * TÍNH LẠI ĐIỂM HẠNH KIỂM
 * =====================================================
 *
 * N1-N5: mỗi lần = -1
 * S1: không trừ điểm
 */
const calculateScore = (groupViolations) => {
  const N1 = groupViolations.N1 || 0;
  const N2 = groupViolations.N2 || 0;
  const N3 = groupViolations.N3 || 0;
  const N4 = groupViolations.N4 || 0;
  const N5 = groupViolations.N5 || 0;

  const totalConductViolations =
    N1 + N2 + N3 + N4 + N5;

  const totalDeduction = totalConductViolations;

  const finalScore = Math.max(
    0,
    100 - totalDeduction
  );

  return {
    totalConductViolations,
    totalDeduction,
    finalScore,
  };
};


/**
 * =====================================================
 * LẤY TẤT CẢ ĐIỂM HẠNH KIỂM
 * =====================================================
 */
exports.getAllScores = async (req, res) => {
  try {
    const {
      academicYear,
      weekNumber,
      className,
    } = req.query;

    const filter = {};

    if (academicYear) {
      filter.academicYear = academicYear;
    }

    if (weekNumber) {
      filter.weekNumber = Number(weekNumber);
    }

    if (className) {
      filter.className = className;
    }

    const scores =
      await StudentConductScore.find(filter)
        .sort({
          className: 1,
          name: 1,
        });

    res.json(scores);
  } catch (err) {
    console.error(
      'getAllScores error:',
      err
    );

    res.status(500).json({
      message: 'Server error',
    });
  }
};


/**
 * =====================================================
 * LẤY ĐIỂM CỦA 1 HỌC SINH
 * =====================================================
 */
exports.getStudentScore = async (req, res) => {
  try {
    const {
      name,
      className,
      academicYear,
      weekNumber,
    } = req.query;

    // ========================================================
    // VALIDATE
    // ========================================================

    if (
      !name ||
      !className ||
      !academicYear ||
      !weekNumber
    ) {
      return res.status(400).json({
        message:
          "Thiếu name, className, academicYear hoặc weekNumber",
      });
    }

    const queryName =
      String(name).trim();

    const queryClass =
      String(className).trim();

    const queryAcademicYear =
      String(academicYear).trim();

    const week =
      Number(weekNumber);

    if (!Number.isInteger(week) || week < 1) {
      return res.status(400).json({
        message: "weekNumber không hợp lệ",
      });
    }

    console.log(
      "🔎 TÌM CONDUCT SCORE:",
      {
        name: queryName,
        className: queryClass,
        academicYear: queryAcademicYear,
        weekNumber: week,
      }
    );

    // ========================================================
    // TÌM CONDUCT SCORE
    // Không phân biệt chữ hoa / chữ thường ở tên
    // ========================================================

    const score =
      await StudentConductScore.findOne({
        name: {
          $regex: `^${queryName.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}$`,
          $options: "i",
        },

        className: queryClass,

        academicYear:
          queryAcademicYear,

        weekNumber: week,
      });

    // ========================================================
    // KHÔNG TÌM THẤY
    // ========================================================

    if (!score) {
      console.log(
        "⚠️ KHÔNG TÌM THẤY CONDUCT SCORE:",
        {
          name: queryName,
          className: queryClass,
          academicYear:
            queryAcademicYear,
          weekNumber: week,
        }
      );

      return res.json({
        name: queryName,
        className: queryClass,
        academicYear:
          queryAcademicYear,
        weekNumber: week,

        maxScore: 100,

        groupViolations: {
          N1: 0,
          N2: 0,
          N3: 0,
          N4: 0,
          N5: 0,
          S1: 0,
        },

        totalConductViolations: 0,
        totalDeduction: 0,
        finalScore: 100,

        hasSeriousViolation: false,

        status: "DRAFT",
      });
    }

    // ========================================================
    // TÌM THẤY
    // ========================================================

    console.log(
      "✅ TÌM THẤY CONDUCT SCORE:",
      {
        _id: score._id,
        name: score.name,
        className: score.className,
        academicYear:
          score.academicYear,
        weekNumber:
          score.weekNumber,
        groupViolations:
          score.groupViolations,
        totalConductViolations:
          score.totalConductViolations,
        totalDeduction:
          score.totalDeduction,
        finalScore:
          score.finalScore,
      }
    );

    return res.json(score);

  } catch (err) {
    console.error(
      "❌ getStudentScore error:",
      err
    );

    return res.status(500).json({
      message: "Server error",
      detail: err.message,
    });
  }
};
/**
 * =====================================================
 * TẠO / CẬP NHẬT ĐIỂM HẠNH KIỂM
 * =====================================================
 *
 * Dùng để lưu/cập nhật điểm của từng học sinh.
 *
 * DRAFT:
 * - Có thể tiếp tục cập nhật.
 *
 * FINAL:
 * - Đã chốt.
 */
exports.createOrUpdateScore = async (req, res) => {
  try {
    const {
      name,
      className,
      academicYear,
      weekNumber,
      groupViolations,
      status,
    } = req.body;

    if (
      !name ||
      !className ||
      !academicYear ||
      !weekNumber
    ) {
      return res.status(400).json({
        message:
          'Thiếu thông tin học sinh hoặc tuần',
      });
    }

    const groups = {
      N1: Number(groupViolations?.N1) || 0,
      N2: Number(groupViolations?.N2) || 0,
      N3: Number(groupViolations?.N3) || 0,
      N4: Number(groupViolations?.N4) || 0,
      N5: Number(groupViolations?.N5) || 0,
      S1: Number(groupViolations?.S1) || 0,
    };

    const calculated =
      calculateScore(groups);

    const score =
      await StudentConductScore.findOneAndUpdate(
        {
          name,
          className,
          academicYear,
          weekNumber: Number(weekNumber),
        },
        {
          name,
          className,
          academicYear,
          weekNumber: Number(weekNumber),

          maxScore: 100,

          groupViolations: groups,

          totalConductViolations:
            calculated.totalConductViolations,

          totalDeduction:
            calculated.totalDeduction,

          finalScore:
            calculated.finalScore,

          hasSeriousViolation:
            groups.S1 > 0,

          status:
            status || 'DRAFT',
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

    res.json(score);
  } catch (err) {
    console.error(
      'createOrUpdateScore error:',
      err
    );

    res.status(500).json({
      message: 'Server error',
    });
  }
};


/**
 * =====================================================
 * CHỐT 1 HỌC SINH
 * =====================================================
 *
 * API cũ.
 *
 * Dùng khi cần chốt riêng 1 học sinh.
 */
exports.finalizeScore = async (req, res) => {
  try {
    const { id } = req.params;

    const score =
      await StudentConductScore.findByIdAndUpdate(
        id,
        {
          status: 'FINAL',
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!score) {
      return res.status(404).json({
        message:
          'Không tìm thấy điểm hạnh kiểm',
      });
    }

    res.json(score);
  } catch (err) {
    console.error(
      'finalizeScore error:',
      err
    );

    res.status(500).json({
      message: 'Server error',
    });
  }
};
/**
* =====================================================
 * DUYỆT TOÀN BỘ HỌC SINH TOÀN TRƯỜNG CỦA 1 TUẦN
 * =====================================================
  */
 const normalizeName = (name) => {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
};

const normalizeClass = (className) => {
  return String(className || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
};
/**
 * =====================================================
 * DUYỆT TOÀN BỘ HỌC SINH TOÀN TRƯỜNG CỦA 1 TUẦN
 * =====================================================
 *
 * Ví dụ:
 *
 * {
 *   "academicYear": "2026-2027",
 *   "weekNumber": 1
 * }
 *
 * Một lần duyệt sẽ chuyển toàn bộ học sinh
 * của tuần đó sang FINAL.
 *
 * Sau khi FINAL vẫn cho phép cập nhật.
 * Nếu có bản ghi trở lại DRAFT thì lần duyệt tiếp
 * theo sẽ chuyển lại toàn bộ sang FINAL.
 */
exports.finalizeClassWeek = async (req, res) => {
  try {
    const {
      academicYear,
      weekNumber,
    } = req.body;

    // ==========================================
    // KIỂM TRA DỮ LIỆU
    // ==========================================

    if (!academicYear || weekNumber === undefined || weekNumber === null) {
      return res.status(400).json({
        message: "Thiếu academicYear hoặc weekNumber",
      });
    }

    const normalizedAcademicYear =
      String(academicYear).trim();

    const week = Number(weekNumber);

    if (!Number.isInteger(week) || week < 1) {
      return res.status(400).json({
        message: "weekNumber không hợp lệ",
      });
    }

    // ==========================================
    // LẤY TOÀN BỘ HỌC SINH TOÀN TRƯỜNG
    // ==========================================

    const students = await Student.find({
      name: {
        $exists: true,
        $type: "string",
        $ne: "",
      },
    })
      .select("name className")
      .lean();

    console.log(
      "🔎 STUDENT SAMPLE:",
      students.slice(0, 5)
    );

    if (!students.length) {
      return res.status(404).json({
        message: "Không có học sinh trong hệ thống",
      });
    }

    // ==========================================
    // BIẾN THỐNG KÊ
    // ==========================================

    let created = 0;
    let finalized = 0;
    let alreadyFinal = 0;

    // ==========================================
    // DUYỆT TỪNG HỌC SINH
    // ==========================================

    for (const student of students) {

      // ------------------------------------------
      // CHUẨN HÓA TÊN + LỚP
      // GIỐNG updateStudentConductScore()
      // ------------------------------------------

      const normalizedName =
        normalizeName(student.name);

      const normalizedClassName =
        normalizeClass(student.className);

      // ------------------------------------------
      // TÌM RECORD HẠNH KIỂM HIỆN CÓ
      // ------------------------------------------

      const existing =
        await StudentConductScore.findOne({
          name: normalizedName,
          className: normalizedClassName,
          academicYear: normalizedAcademicYear,
          weekNumber: week,
        });

      // ==========================================
      // ĐÃ CÓ RECORD
      // ==========================================

      if (existing) {

        console.log(
          "🔎 TÌM THẤY RECORD:",
          {
            name: normalizedName,
            className: normalizedClassName,
            weekNumber: week,
            status: existing.status,
            totalConductViolations:
              existing.totalConductViolations,
            finalScore:
              existing.finalScore,
          }
        );

        // ----------------------------------------
        // ĐÃ FINAL
        // Không làm gì nữa
        // ----------------------------------------

        if (existing.status === "FINAL") {
          alreadyFinal++;
          continue;
        }

        // ----------------------------------------
        // DRAFT → FINAL
        //
        // QUAN TRỌNG:
        // Không thay đổi:
        // - groupViolations
        // - totalConductViolations
        // - totalDeduction
        // - finalScore
        // - hasSeriousViolation
        //
        // Chỉ chốt trạng thái.
        // ----------------------------------------

        existing.status = "FINAL";

        await existing.save();

        finalized++;

        console.log(
          "✅ ĐÃ CHỐT:",
          {
            name: existing.name,
            className: existing.className,
            weekNumber: existing.weekNumber,
            totalConductViolations:
              existing.totalConductViolations,
            finalScore:
              existing.finalScore,
            status: existing.status,
          }
        );

        continue;
      }

      // ==========================================
      // CHƯA CÓ RECORD
      //
      // Tạo record mặc định:
      // 0 lỗi - 100 điểm - FINAL
      // ==========================================

      const newScore =
        await StudentConductScore.create({
          name: normalizedName,
          className: normalizedClassName,

          academicYear:
            normalizedAcademicYear,

          weekNumber: week,

          groupViolations: {
            N1: 0,
            N2: 0,
            N3: 0,
            N4: 0,
            N5: 0,
            S1: 0,
          },

          totalConductViolations: 0,
          totalDeduction: 0,

          maxScore: 100,
          finalScore: 100,

          hasSeriousViolation: false,

          status: "FINAL",
        });

      created++;

      console.log(
        "🆕 TẠO RECORD FINAL:",
        {
          name: newScore.name,
          className: newScore.className,
          weekNumber: newScore.weekNumber,
          status: newScore.status,
        }
      );
    }

    // ==========================================
    // TỔNG KẾT
    // ==========================================

    const totalFinal =
      created +
      finalized +
      alreadyFinal;

    console.log(
      "==============================================="
    );

    console.log(
      "✅ HOÀN TẤT DUYỆT HẠNH KIỂM TOÀN TRƯỜNG",
      {
        academicYear:
          normalizedAcademicYear,

        weekNumber: week,

        totalStudents:
          students.length,

        created,
        finalized,
        alreadyFinal,
        totalFinal,
      }
    );

    console.log(
      "==============================================="
    );

    return res.json({
      message:
        `Đã duyệt hạnh kiểm tuần ${week} toàn trường`,

      academicYear:
        normalizedAcademicYear,

      weekNumber: week,

      totalStudents:
        students.length,

      created,
      finalized,
      alreadyFinal,

      totalFinal,
    });

  } catch (err) {

    console.error(
      "❌ finalizeClassWeek error:",
      err
    );

    return res.status(500).json({
      message:
        "Lỗi duyệt hạnh kiểm toàn trường",

      error:
        err.message,
    });
  }
};


/**
 * =====================================================
 * XÓA ĐIỂM
 * =====================================================
 */
exports.deleteScore = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted =
      await StudentConductScore.findByIdAndDelete(
        id
      );

    if (!deleted) {
      return res.status(404).json({
        message:
          'Không tìm thấy điểm hạnh kiểm',
      });
    }

    res.json({
      message:
        'Đã xóa điểm hạnh kiểm',
    });
  } catch (err) {
    console.error(
      'deleteScore error:',
      err
    );

    res.status(500).json({
      message:
        'Server error',
    });
  }
};
