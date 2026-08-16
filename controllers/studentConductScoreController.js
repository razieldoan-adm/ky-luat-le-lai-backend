const StudentConductScore = require('../models/StudentConductScore');

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

    if (
      !name ||
      !className ||
      !academicYear ||
      !weekNumber
    ) {
      return res.status(400).json({
        message:
          'Thiếu name, className, academicYear hoặc weekNumber',
      });
    }

    const score =
      await StudentConductScore.findOne({
        name,
        className,
        academicYear,
        weekNumber: Number(weekNumber),
      });

    /**
     * Nếu chưa có bản ghi:
     * trả về dữ liệu mặc định DRAFT.
     */
    if (!score) {
      return res.json({
        name,
        className,
        academicYear,
        weekNumber: Number(weekNumber),

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

        status: 'DRAFT',
      });
    }

    res.json(score);
  } catch (err) {
    console.error(
      'getStudentScore error:',
      err
    );

    res.status(500).json({
      message: 'Server error',
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
 * CHỐT TOÀN BỘ HỌC SINH CỦA 1 LỚP / 1 TUẦN
 * =====================================================
 *
 * Đây là chức năng BGH/Admin sử dụng.
 *
 * Ví dụ:
 *
 * {
 *   "className": "6A1",
 *   "academicYear": "2026-2027",
 *   "weekNumber": 1
 * }
 *
 * Tất cả bản ghi của lớp + tuần đó
 * sẽ chuyển:
 *
 * DRAFT → FINAL
 *
 * Không cần chốt từng học sinh.
 */
exports.finalizeClassWeek = async (req, res) => {
  try {
    const {
      className,
      academicYear,
      weekNumber,
    } = req.body;

    if (
      !className ||
      !academicYear ||
      !weekNumber
    ) {
      return res.status(400).json({
        message:
          'Thiếu className, academicYear hoặc weekNumber',
      });
    }

    const week = Number(weekNumber);

    if (!Number.isInteger(week) || week < 1) {
      return res.status(400).json({
        message:
          'weekNumber không hợp lệ',
      });
    }

    /**
     * ================================================
     * LẤY CÁC BẢN GHI CỦA LỚP + TUẦN
     * ================================================
     */
    const scores =
      await StudentConductScore.find({
        className,
        academicYear,
        weekNumber: week,
      });

    /**
     * Nếu chưa có dữ liệu thì không cho chốt.
     *
     * Tránh trường hợp BGH bấm nhầm
     * nhưng database không có học sinh nào.
     */
    if (!scores.length) {
      return res.status(404).json({
        message:
          `Chưa có dữ liệu hạnh kiểm tuần ${week} của lớp ${className}`,
      });
    }

    /**
     * ================================================
     * KIỂM TRA ĐÃ CHỐT CHƯA
     * ================================================
     */
    const finalCount =
      scores.filter(
        (score) =>
          score.status === 'FINAL'
      ).length;

    /**
     * Nếu toàn bộ đã FINAL
     * thì báo đã chốt.
     */
    if (
      finalCount ===
      scores.length
    ) {
      return res.json({
        message:
          `Hạnh kiểm tuần ${week} lớp ${className} đã được chốt trước đó`,
        className,
        academicYear,
        weekNumber: week,
        existing: scores.length,
        finalized: finalCount,
        modified: 0,
        alreadyFinal: true,
      });
    }

    /**
     * ================================================
     * CHỐT TOÀN BỘ
     * ================================================
     */
    const result =
      await StudentConductScore.updateMany(
        {
          className,
          academicYear,
          weekNumber: week,
          status: {
            $ne: 'FINAL',
          },
        },
        {
          $set: {
            status: 'FINAL',
          },
        }
      );

    const modified =
      result.modifiedCount ??
      result.nModified ??
      0;

    res.json({
      message:
        `Đã chốt hạnh kiểm tuần ${week} lớp ${className}`,

      className,

      academicYear,

      weekNumber: week,

      existing:
        scores.length,

      alreadyFinal:
        finalCount,

      modified,

      totalFinal:
        finalCount + modified,
    });
  } catch (err) {
    console.error(
      'finalizeClassWeek error:',
      err
    );

    res.status(500).json({
      message:
        'Server error',
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
