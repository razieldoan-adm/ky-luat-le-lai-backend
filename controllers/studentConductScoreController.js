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

    const scores = await StudentConductScore.find(filter)
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
 * Dùng khi cần cập nhật trực tiếp.
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

    const calculated = calculateScore(groups);

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

          status: status || 'DRAFT',
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
 * CHỐT ĐIỂM HẠNH KIỂM TUẦN
 * =====================================================
 */
exports.finalizeScore = async (req, res) => {
  try {
    const { id } = req.params;

    const score =
      await StudentConductScore.findByIdAndUpdate(
        id,
        {
          status: "FINAL",
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!score) {
      return res.status(404).json({
        message:
          "Không tìm thấy điểm hạnh kiểm",
      });
    }

    res.json(score);
  } catch (err) {
    console.error(
      "finalizeScore error:",
      err
    );

    res.status(500).json({
      message: "Server error",
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
      message: 'Server error',
    });
  }
};
