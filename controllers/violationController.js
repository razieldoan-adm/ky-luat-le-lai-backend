const Violation = require('../models/Violation');
const Rule = require('../models/Rule');
const Setting = require('../models/Setting');
const StudentConductScore = require('../models/StudentConductScore');

// ============================================================
// HELPER
// ============================================================

const normalizeName = (name) => {
  return String(name || "").trim().toLowerCase();
};

const normalizeClass = (className) => {
  return String(className || "").trim().toUpperCase();
};

// ============================================================
// TÌM RULE
// ============================================================

const getRuleByDescription = async (description) => {
  if (!description) return null;

  return Rule.findOne({
    title: String(description).trim(),
    active: true,
  });
};

// ============================================================
// TÌM GROUP CODE CỦA VIOLATION
// ============================================================

const getGroupCode = async (violation) => {
  let groupCode = String(
    violation.groupCode || ""
  )
    .trim()
    .toUpperCase();

  // Nếu Violation đã có groupCode thì dùng luôn
  if (groupCode) {
    return groupCode;
  }

  // Dữ liệu cũ chưa có groupCode
  const rule = await getRuleByDescription(
    violation.description
  );

  if (rule?.groupCode) {
    return String(rule.groupCode)
      .trim()
      .toUpperCase();
  }

  return "";
};

// ============================================================
// ⭐ TÍNH LẠI ĐIỂM HẠNH KIỂM
//
// QUAN TRỌNG:
//
// StudentConductScore KHÔNG lưu từng lỗi.
//
// Violation mới là dữ liệu gốc.
//
// Mỗi lần gọi hàm này:
// → lấy toàn bộ Violation của HS trong tuần
// → đếm N1-N5/S1
// → cập nhật DUY NHẤT 1 StudentConductScore
// ============================================================

const updateStudentConductScore = async (
  studentName,
  className,
  academicYear,
  weekNumber
) => {
  if (
    !studentName ||
    !className ||
    !academicYear ||
    weekNumber === undefined ||
    weekNumber === null
  ) {
    console.error(
      "❌ updateStudentConductScore thiếu dữ liệu:",
      {
        studentName,
        className,
        academicYear,
        weekNumber,
      }
    );

    return null;
  }

  const name = normalizeName(studentName);
  const classNormalized = normalizeClass(className);
  const week = Number(weekNumber);

  if (!Number.isInteger(week) || week < 1) {
    console.error(
      "❌ weekNumber không hợp lệ:",
      weekNumber
    );

    return null;
  }

// ==========================================================
// LẤY TOÀN BỘ VI PHẠM CỦA HS TRONG TUẦN
// ==========================================================

const violations = await Violation.find({
  name: name,
  className: classNormalized,
  weekNumber: week,
});

console.log("🔍 KIỂM TRA VI PHẠM:");
console.log({
  queryName: name,
  queryClass: classNormalized,
  queryWeek: week,
  queryAcademicYear: String(academicYear).trim(),
  totalFound: violations.length,
});

if (violations.length > 0) {
  console.log(
    "📋 VI PHẠM TÌM ĐƯỢC:",
    violations.map((v) => ({
      _id: v._id,
      name: v.name,
      className: v.className,
      academicYear: v.academicYear,
      weekNumber: v.weekNumber,
      groupCode: v.groupCode,
      ruleCode: v.ruleCode,
    }))
  );
}

  console.log(
    "================================================"
  );

  console.log(
    "🔎 TÍNH LẠI HẠNH KIỂM"
  );

  console.log({
    name,
    className: classNormalized,
    academicYear,
    weekNumber: week,
    totalViolations: violations.length,
  });

  // ==========================================================
  // KHỞI TẠO BỘ ĐẾM
  // ==========================================================

  const groupViolations = {
    N1: 0,
    N2: 0,
    N3: 0,
    N4: 0,
    N5: 0,
    S1: 0,
  };

  // ==========================================================
  // ĐẾM TỪ VIOLATION
  // ==========================================================

  for (const violation of violations) {
    const groupCode =
      await getGroupCode(violation);

    console.log(
      "→ Violation:",
      violation._id,
      "|",
      violation.description,
      "| group:",
      groupCode
    );

    if (
      [
        "N1",
        "N2",
        "N3",
        "N4",
        "N5",
        "S1",
      ].includes(groupCode)
    ) {
      groupViolations[groupCode]++;
    }
  }

  // ==========================================================
  // TỔNG LỖI TÍNH HẠNH KIỂM
  // ==========================================================

  const totalConductViolations =
    groupViolations.N1 +
    groupViolations.N2 +
    groupViolations.N3 +
    groupViolations.N4 +
    groupViolations.N5;

  // ==========================================================
  // MỖI LỖI N1-N5 = -1
  // ==========================================================

  const totalDeduction =
    totalConductViolations;

  // ==========================================================
  // LẤY ĐIỂM TỐI ĐA
  // ==========================================================

  const setting =
    await Setting.findOne();

  const maxScore = Number(
    setting?.maxConductScore ??
      setting?.maxMeritScore ??
      100
  );

  // ==========================================================
  // TÍNH ĐIỂM
  // ==========================================================

  const finalScore = Math.max(
    0,
    maxScore - totalDeduction
  );

  // ==========================================================
  // S1
  // ==========================================================

  const hasSeriousViolation =
    groupViolations.S1 > 0;

  console.log(
    "📊 KẾT QUẢ:",
    {
      groupViolations,
      totalConductViolations,
      totalDeduction,
      maxScore,
      finalScore,
      hasSeriousViolation,
    }
  );


// ==========================================================
// ⭐TÌM RECORD HẠNH KIỂM HIỆN TẠI UPSERT DUY NHẤT 1 BẢN GHI
// ==========================================================

const existingScore =
  await StudentConductScore.findOne({
    name,
    className: classNormalized,
    academicYear: String(
      academicYear
    ).trim(),
    weekNumber: week,
  });

// ==========================================================
// XÁC ĐỊNH TRẠNG THÁI
// ==========================================================
//
// - Chưa có record  → DRAFT
// - Đã có FINAL     → chuyển về DRAFT vì dữ liệu đã thay đổi
// - Đang DRAFT      → giữ DRAFT
// ==========================================================

const newStatus = "DRAFT";

// ==========================================================
// UPSERT DUY NHẤT 1 BẢN GHI
// ==========================================================

const score =
  await StudentConductScore.findOneAndUpdate(
    {
      name,
      className: classNormalized,
      academicYear:
        String(academicYear).trim(),
      weekNumber: week,
    },
    {
      $set: {
        name,
        className: classNormalized,
        academicYear:
          String(academicYear).trim(),
        weekNumber: week,

        maxScore,

        groupViolations,

        totalConductViolations,

        totalDeduction,

        finalScore,

        hasSeriousViolation,

        // Có thay đổi → phải duyệt lại
        status: newStatus,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

console.log(
  "📌 TRẠNG THÁI TRƯỚC KHI CẬP NHẬT:",
  existingScore?.status || "CHƯA CÓ"
);

console.log(
  "📌 TRẠNG THÁI SAU KHI CẬP NHẬT:",
  score.status
);

console.log(
  "✅ ĐÃ CẬP NHẬT STUDENT CONDUCT SCORE:",
  score
);

  console.log(
    "✅ ĐÃ CẬP NHẬT STUDENT CONDUCT SCORE:",
    score
  );

  console.log(
    "================================================"
  );

  return score;
};

 // ============================================================
// XÓA BẢN GHI HK NẾU HS KHÔNG CÒN VI PHẠM TRONG TUẦN
// ============================================================

const cleanupStudentConductScore = async (
  studentName,
  className,
  academicYear,
  weekNumber
) => {
  if (
    !studentName ||
    !className ||
    !academicYear ||
    weekNumber === undefined ||
    weekNumber === null
  ) {
    return;
  }

  const name = normalizeName(studentName);
  const week = Number(weekNumber);

  const count = await Violation.countDocuments({
    name,
    className,
    academicYear,
    weekNumber: week,
  });

  // Không còn vi phạm
  if (count === 0) {
    await StudentConductScore.deleteOne({
      name,
      className,
      academicYear,
      weekNumber: week,
    });

    console.log(
      "🗑️ Đã xóa bản ghi HK vì HS không còn vi phạm:",
      {
        name,
        className,
        academicYear,
        weekNumber: week,
      }
    );
  }
};

// ============================================================
// 🔎 TÌM HỌC SINH
// ============================================================

exports.searchViolations = async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({
      error: 'Missing name',
    });
  }

  try {
    const regex = new RegExp(name, 'i');

    const matches = await Violation.find({
      name: regex,
    }).distinct('name');

    const results = [];

    for (const matchedName of matches) {
      const v = await Violation.findOne({
        name: matchedName,
      });

      if (v) {
        results.push({
          name: v.name,
          className: v.className,
        });
      }
    }

    res.json(results);
  } catch (err) {
    console.error(
      'searchViolations error:',
      err
    );

    res.status(500).json({
      error: 'Server error',
    });
  }
};

// ============================================================
// 📌 LẤY VI PHẠM THEO HỌC SINH
// ============================================================

exports.getViolationsByStudent = async (
  req,
  res
) => {
  const { className } = req.query;

  const name = normalizeName(
    req.params.name
  );

  try {
    const violations = await Violation.find({
      name,
      className,
    }).collation({
      locale: 'en',
      strength: 2,
    });

    res.json(violations);
  } catch (err) {
    console.error(
      'getViolationsByStudent error:',
      err
    );

    res.status(500).json({
      error: 'Server error',
    });
  }
};

// ============================================================
// ➕ GHI NHẬN VI PHẠM
// ============================================================

exports.createViolation = async (req, res) => {
  try {
    const {
      className,
      description,
      ruleCode,
      groupCode,
      academicYear,
      handlingMethod,
      handledBy,
      handlingNote,
      weekNumber,
      time,
      name: rawName,
    } = req.body;

    // ========================================================
    // VALIDATE
    // ========================================================

    if (
      !rawName ||
      !description ||
      !className
    ) {
      return res.status(400).json({
        error:
          "Thiếu name, description hoặc className",
      });
    }

    if (
      !ruleCode ||
      !groupCode
    ) {
      return res.status(400).json({
        error:
          "Thiếu ruleCode hoặc groupCode",
      });
    }

    if (
      weekNumber === undefined ||
      weekNumber === null
    ) {
      return res.status(400).json({
        error: "Thiếu weekNumber",
      });
    }

    if (!academicYear) {
      return res.status(400).json({
        error: "Thiếu academicYear",
      });
    }

    const name =
      normalizeName(rawName);

    const normalizedClass =
      normalizeClass(className);

    const week =
      Number(weekNumber);

    // ========================================================
    // TÌM RULE
    // ========================================================

    const rule =
      await getRuleByDescription(
        description
      );

    const penalty =
      rule &&
      typeof rule.point === "number"
        ? rule.point
        : 0;

    // ========================================================
    // TẠO VIOLATION
    //
    // MỖI LỖI = 1 DOCUMENT
    // ========================================================

    const violation =
      new Violation({
        name,
        className: normalizedClass,

        description,

        ruleCode,

        groupCode:
          String(groupCode)
            .trim()
            .toUpperCase(),

        academicYear:
          String(academicYear).trim(),

        penalty,

        handlingMethod:
          handlingMethod || "",

        handledBy:
          handledBy || "",

        handlingNote:
          handlingNote || "",

        handled:
          !!handledBy,

        weekNumber: week,

        time: time
          ? new Date(time)
          : new Date(),
      });

    await violation.save();

    // ========================================================
    // ⭐ TÍNH LẠI HẠNH KIỂM
    // ========================================================

    const conductScore =
      await updateStudentConductScore(
        name,
        normalizedClass,
        String(academicYear).trim(),
        week
      );

    // ========================================================
    // TRẢ KẾT QUẢ
    // ========================================================

    res.status(201).json({
      violation,
      conductScore,
    });
  } catch (error) {
    console.error(
      "❌ createViolation:",
      error
    );

    res.status(500).json({
      error:
        "Lỗi khi ghi nhận vi phạm",
      detail:
        error.message,
    });
  }
};

// ============================================================
// 🛠️ XỬ LÝ VI PHẠM
// ============================================================

exports.handleViolation = async (
  req,
  res
) => {
  const { id } = req.params;

  const {
    handledBy,
    role,
  } = req.body;

  try {
    const violation =
      await Violation.findById(id);

    if (!violation) {
      return res.status(404).json({
        error:
          'Không tìm thấy vi phạm',
      });
    }

    const weekNumber =
      violation.weekNumber;

    const studentId =
      violation.studentId;

    const setting =
      await Setting.findOne();

    const limitGVCN =
      setting?.limitGVCNHandling ??
      false;

    // --------------------------------------------
    // Giới hạn GVCN
    // --------------------------------------------

    if (
      limitGVCN &&
      role === 'GVCN'
    ) {
      const count =
        await Violation.countDocuments({
          studentId,
          weekNumber,
        });

      if (count >= 2) {
        return res.status(403).json({
          message:
            'Học sinh đã vi phạm ≥ 2 lần trong tuần này. GVCN không được phép xử lý thêm.',
        });
      }
    }

    violation.handledBy =
      handledBy || '';

    violation.handled = true;

    // --------------------------------------------
    // Tự xác định hình thức xử lý
    // --------------------------------------------

    if (!violation.handlingMethod) {
      const count =
        await Violation.countDocuments({
          name: violation.name,
        });

      let method = '';

      if (count === 1)
        method = 'Nhắc nhở';
      else if (count === 2)
        method = 'Kiểm điểm';
      else if (count === 3)
        method = 'Chép phạt';
      else if (count === 4)
        method = 'Báo phụ huynh';
      else if (count === 5)
        method = 'Mời phụ huynh';
      else if (count === 6)
        method =
          'Tạm dừng việc học tập';
      else
        method =
          'Xét hạ hạnh kiểm';

      violation.handlingMethod =
        method;
    }

    await violation.save();

    res.json(violation);
  } catch (err) {
    console.error(
      'Lỗi khi xử lý vi phạm:',
      err
    );

    res.status(500).json({
      error:
        'Lỗi server khi xử lý vi phạm',
    });
  }
};

// ============================================================
// ✅ ĐÁNH DẤU ĐÃ XỬ LÝ
// ============================================================

exports.markViolationHandled = async (
  req,
  res
) => {
  const { id } = req.params;

  try {
    const violation =
      await Violation.findByIdAndUpdate(
        id,
        {
          handled: true,
        },
        {
          new: true,
        }
      );

    if (!violation) {
      return res.status(404).json({
        error:
          'Violation not found',
      });
    }

    res.json({
      message:
        'Violation marked as handled',
      violation,
    });
  } catch (err) {
    console.error(
      'markViolationHandled error:',
      err
    );

    res.status(500).json({
      error: 'Server error',
    });
  }
};

// ============================================================
// ❌ XÓA VI PHẠM
// ============================================================

exports.deleteViolation = async (req, res) => {
  try {
    const { id } = req.params;

    // ==========================================================
    // 1. LẤY VI PHẠM TRƯỚC KHI XÓA
    // ==========================================================

    const violation =
      await Violation.findById(id);

    if (!violation) {
      return res.status(404).json({
        message: "Không tìm thấy vi phạm",
      });
    }

    const name = violation.name;
    const className = violation.className;
    const academicYear =
      violation.academicYear;

    const weekNumber =
      Number(violation.weekNumber);

    const groupCode =
      String(
        violation.groupCode || ""
      )
        .trim()
        .toUpperCase();

    console.log(
      "🗑️ CHUẨN BỊ XÓA VI PHẠM:",
      {
        id,
        name,
        className,
        academicYear,
        weekNumber,
        groupCode,
        ruleCode:
          violation.ruleCode,
      }
    );

    // ==========================================================
    // 2. KIỂM TRA NHÓM
    // ==========================================================

    const validGroups = [
      "N1",
      "N2",
      "N3",
      "N4",
      "N5",
      "S1",
    ];

    if (
      !validGroups.includes(groupCode)
    ) {
      return res.status(400).json({
        message:
          `groupCode không hợp lệ: ${groupCode}`,
      });
    }

    // ==========================================================
    // 3. XÓA VI PHẠM
    // ==========================================================

    const deleted =
      await Violation.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        message:
          "Không thể xóa vi phạm",
      });
    }

    console.log(
      "✅ ĐÃ XÓA VI PHẠM:",
      {
        id,
        groupCode,
      }
    );

    // ==========================================================
    // 4. TÌM CONDUCT SCORE
    // ==========================================================

    const conductScore =
      await StudentConductScore.findOne({
        name,
        className,
        academicYear,
        weekNumber,
      });

    console.log(
      "🔎 CONDUCT SCORE TRƯỚC KHI CẬP NHẬT:",
      conductScore
        ? {
            _id: conductScore._id,
            groupViolations:
              conductScore.groupViolations,
            totalConductViolations:
              conductScore.totalConductViolations,
            totalDeduction:
              conductScore.totalDeduction,
            finalScore:
              conductScore.finalScore,
          }
        : "KHÔNG TÌM THẤY"
    );

    // ==========================================================
    // 5. NẾU KHÔNG CÓ CONDUCT SCORE
    // ==========================================================

    if (!conductScore) {
      console.error(
        "❌ KHÔNG TÌM THẤY CONDUCT SCORE ĐỂ CẬP NHẬT:",
        {
          name,
          className,
          academicYear,
          weekNumber,
        }
      );

      return res.status(500).json({
        message:
          "Đã xóa vi phạm nhưng không tìm thấy ConductScore để cập nhật.",
      });
    }

    // ==========================================================
    // 6. LẤY GIÁ TRỊ HIỆN TẠI
    // ==========================================================

    const groups = {
      N1:
        Number(
          conductScore.groupViolations?.N1
        ) || 0,

      N2:
        Number(
          conductScore.groupViolations?.N2
        ) || 0,

      N3:
        Number(
          conductScore.groupViolations?.N3
        ) || 0,

      N4:
        Number(
          conductScore.groupViolations?.N4
        ) || 0,

      N5:
        Number(
          conductScore.groupViolations?.N5
        ) || 0,

      S1:
        Number(
          conductScore.groupViolations?.S1
        ) || 0,
    };

    // ==========================================================
    // 7. TRỪ ĐÚNG NHÓM CỦA LỖI VỪA XÓA
    // ==========================================================

    groups[groupCode] = Math.max(
      0,
      groups[groupCode] - 1
    );

    // ==========================================================
    // 8. TÍNH LẠI TỔNG
    // ==========================================================

    const totalConductViolations =
      groups.N1 +
      groups.N2 +
      groups.N3 +
      groups.N4 +
      groups.N5;

    const totalDeduction =
      totalConductViolations;

    const maxScore =
      Number(
        conductScore.maxScore
      ) || 100;

    const finalScore =
      Math.max(
        0,
        maxScore - totalDeduction
      );

    const hasSeriousViolation =
      groups.S1 > 0;

    // ==========================================================
    // 9. CẬP NHẬT TRỰC TIẾP DATABASE
    // ==========================================================

    const updatedScore =
      await StudentConductScore.findOneAndUpdate(
        {
          _id: conductScore._id,
        },
        {
          $set: {
            groupViolations:
              groups,

            totalConductViolations:
              totalConductViolations,

            totalDeduction:
              totalDeduction,

            finalScore:
              finalScore,

            hasSeriousViolation:
              hasSeriousViolation,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    // ==========================================================
    // 10. KIỂM TRA KẾT QUẢ
    // ==========================================================

    console.log(
      "✅ CONDUCT SCORE SAU KHI XÓA:",
      {
        _id:
          updatedScore?._id,

        groupViolations:
          updatedScore?.groupViolations,

        totalConductViolations:
          updatedScore?.totalConductViolations,

        totalDeduction:
          updatedScore?.totalDeduction,

        finalScore:
          updatedScore?.finalScore,

        hasSeriousViolation:
          updatedScore?.hasSeriousViolation,
      }
    );

    // ==========================================================
    // 11. TRẢ KẾT QUẢ
    // ==========================================================

    return res.json({
      message:
        "Đã xóa vi phạm và cập nhật điểm hạnh kiểm.",

      violationId: id,

      conductScore:
        updatedScore,
    });

  } catch (err) {
    console.error(
      "❌ LỖI deleteViolation:",
      err
    );

    return res.status(500).json({
      message:
        "Lỗi server khi xóa vi phạm.",
      error:
        err.message,
    });
  }
};
// ============================================================
// 🔔 HỌC SINH CÓ VI PHẠM CHƯA XỬ LÝ
// ============================================================

exports.getUnhandledViolationStudents =
  async (req, res) => {
    try {
      const unhandled =
        await Violation.aggregate([
          {
            $match: {
              handled: false,
            },
          },

          {
            $group: {
              _id: {
                name: '$name',
                className:
                  '$className',
              },

              count: {
                $sum: 1,
              },
            },
          },

          {
            $project: {
              _id: 0,
              name: '$_id.name',
              className:
                '$_id.className',
              count: 1,
            },
          },
        ]).collation({
          locale: 'en',
          strength: 2,
        });

      res.json(unhandled);
    } catch (err) {
      console.error(
        'getUnhandledViolationStudents error:',
        err
      );

      res.status(500).json({
        error: 'Server error',
      });
    }
  };

// ============================================================
// 📊 LẤY TOÀN BỘ VI PHẠM
// ============================================================

exports.getAllViolationStudents =
  async (req, res) => {
    try {
      const {
        weekNumber,
      } = req.query;

      const filter = {};

      if (weekNumber) {
        filter.weekNumber =
          Number(weekNumber);
      }

      const violations =
        await Violation.find(filter)
          .sort({
            time: -1,
          })
          .limit(500);

      res.json(violations);
    } catch (error) {
      console.error(
        'getAllViolationStudents error:',
        error
      );

      res.status(500).json({
        error:
          'Lỗi server khi lấy danh sách vi phạm',
      });
    }
  };

// ============================================================
// 📌 TỔNG SỐ VI PHẠM
// ============================================================

exports.getViolationCount =
  async (req, res) => {
    try {
      const count =
        await Violation.countDocuments();

      res.json({
        count,
      });
    } catch (err) {
      res.status(500).json({
        error: 'Server error',
      });
    }
  };

// ============================================================
// 📌 SỐ VI PHẠM CHƯA XỬ LÝ
// ============================================================

exports.getUnhandledViolationCount =
  async (req, res) => {
    try {
      const count =
        await Violation.countDocuments({
          handled: false,
        });

      res.json({
        count,
      });
    } catch (err) {
      res.status(500).json({
        error: 'Server error',
      });
    }
  };

// ============================================================
// 📌 ĐẾM HS VI PHẠM >= 3 LẦN
// ============================================================

exports.countMultipleViolations =
  async (req, res) => {
    try {
      const result =
        await Violation.aggregate([
          {
            $group: {
              _id: {
                name: '$name',
                className:
                  '$className',
              },

              count: {
                $sum: 1,
              },
            },
          },

          {
            $match: {
              count: {
                $gte: 3,
              },
            },
          },

          {
            $count: 'count',
          },
        ]).collation({
          locale: 'en',
          strength: 2,
        });

      res.json({
        count:
          result[0]?.count || 0,
      });
    } catch (err) {
      console.error(
        'Lỗi khi đếm học sinh vi phạm nhiều lần:',
        err
      );

      res.status(500).json({
        error: 'Server error',
      });
    }
  };

// ============================================================
// ✏️ SỬA VI PHẠM
//
// Nếu đổi tuần / học sinh / lớp:
// → phải cập nhật lại điểm HK của bản ghi cũ
// → sau đó cập nhật bản ghi mới
// ============================================================

exports.updateViolation = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      description,
      weekNumber,
      time,
      className,
      name: rawName,
      groupCode,
      ruleCode,
      academicYear,
    } = req.body;

    // ========================================================
    // TÌM VIOLATION CŨ
    // ========================================================

    const violation =
      await Violation.findById(id);

    if (!violation) {
      return res.status(404).json({
        error:
          "Không tìm thấy vi phạm.",
      });
    }

    // ========================================================
    // LƯU THÔNG TIN CŨ
    // ========================================================

    const oldName =
      violation.name;

    const oldClassName =
      violation.className;

    const oldAcademicYear =
      violation.academicYear;

    const oldWeekNumber =
      violation.weekNumber;

    // ========================================================
    // CẬP NHẬT
    // ========================================================

    if (description) {
      violation.description =
        description;

      const rule =
        await getRuleByDescription(
          description
        );

      violation.penalty =
        rule &&
        typeof rule.point === "number"
          ? rule.point
          : 0;

      if (rule) {
        violation.ruleCode =
          rule.ruleCode;

        violation.groupCode =
          rule.groupCode;
      }
    }

    if (ruleCode) {
      violation.ruleCode =
        ruleCode;
    }

    if (groupCode) {
      violation.groupCode =
        String(groupCode)
          .trim()
          .toUpperCase();
    }

    if (
      academicYear !== undefined
    ) {
      violation.academicYear =
        String(academicYear).trim();
    }

    if (
      weekNumber !== undefined
    ) {
      violation.weekNumber =
        Number(weekNumber);
    }

    if (time) {
      violation.time =
        new Date(time);
    }

    if (className) {
      violation.className =
        normalizeClass(className);
    }

    if (rawName) {
      violation.name =
        normalizeName(rawName);
    }

    await violation.save();

    // ========================================================
    // ⭐ TÍNH LẠI BẢN GHI CŨ
    //
    // Vì lỗi có thể đã chuyển HS/lớp/tuần
    // ========================================================

    await updateStudentConductScore(
      oldName,
      oldClassName,
      oldAcademicYear,
      oldWeekNumber
    );

    // ========================================================
    // ⭐ TÍNH LẠI BẢN GHI MỚI
    // ========================================================

    const newConductScore =
      await updateStudentConductScore(
        violation.name,
        violation.className,
        violation.academicYear,
        violation.weekNumber
      );

    res.json({
      message:
        "Đã cập nhật vi phạm và điểm hạnh kiểm.",
      violation,
      conductScore:
        newConductScore,
    });
  } catch (error) {
    console.error(
      "❌ updateViolation:",
      error
    );

    res.status(500).json({
      error:
        "Lỗi server khi cập nhật vi phạm.",
      detail:
        error.message,
    });
  }
};

// ============================================================
// ⚙️ LẤY GIỚI HẠN XỬ LÝ GVCN
// ============================================================

exports.getGVCNHandlingLimit =
  async (req, res) => {
    try {
      const setting =
        await Setting.findOne();

      res.json({
        limitGVCNHandling:
          setting?.limitGVCNHandling ??
          false,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          'Lỗi khi lấy cài đặt giới hạn',
      });
    }
  };

// ============================================================
// ⚙️ BẬT/TẮT GIỚI HẠN GVCN
// ============================================================

exports.toggleGVCNHandlingLimit =
  async (req, res) => {
    try {
      const { value } =
        req.body;

      let setting =
        await Setting.findOne();

      if (!setting) {
        setting =
          new Setting();
      }

      setting.limitGVCNHandling =
        value;

      await setting.save();

      res.json({
        success: true,
        limitGVCNHandling:
          value,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          'Lỗi cập nhật giới hạn GVCN',
      });
    }
  };
