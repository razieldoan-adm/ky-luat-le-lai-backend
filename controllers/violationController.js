const Violation = require('../models/Violation');
const Rule = require('../models/Rule');
const Setting = require('../models/Setting');
const StudentConductScore = require('../models/StudentConductScore');

// ============================================================
// HELPER
// ============================================================

// Chuẩn hóa tên học sinh
const normalizeName = (name) => {
  return name?.trim().toLowerCase();
};

// ============================================================
// TÌM RULE THEO NỘI DUNG LỖI
// ============================================================

const getRuleByDescription = async (description) => {
  if (!description) return null;

  return await Rule.findOne({
    title: description.trim(),
    active: true,
  });
};

// ============================================================
// CẬP NHẬT ĐIỂM HẠNH KIỂM CỦA 1 HỌC SINH / 1 TUẦN
//
// QUY TẮC MỚI:
//
// - N1 → mỗi lần = -1 HK
// - N2 → mỗi lần = -1 HK
// - N3 → mỗi lần = -1 HK
// - N4 → mỗi lần = -1 HK
// - N5 → mỗi lần = -1 HK
// - S1 → không trừ điểm HK
//        nhưng đánh dấu lỗi nghiêm trọng
//
// Điểm thi đua lớp KHÔNG dùng ở đây.
// Điểm thi đua lớp vẫn lấy từ Violation.penalty.
//
// Mỗi tuần reset về 100.
// ============================================================

const updateStudentConductScore = async (
  studentName,
  className,
  weekNumber
) => {
  if (!studentName || !className || weekNumber === undefined) {
    return;
  }

  const name = normalizeName(studentName);

  // Lấy tất cả lỗi của học sinh trong đúng tuần
  const violations = await Violation.find({
    name,
    className,
    weekNumber: Number(weekNumber),
  });

  // --------------------------------------------
  // Đếm số lỗi theo nhóm
  // --------------------------------------------

  const groupCounts = {
    N1: 0,
    N2: 0,
    N3: 0,
    N4: 0,
    N5: 0,
  };

  let seriousViolation = false;

  for (const violation of violations) {
    const rule = await getRuleByDescription(
      violation.description
    );

    if (!rule) {
      continue;
    }

    const groupCode = rule.groupCode?.toUpperCase();

    // Nhóm lỗi hạnh kiểm
    if (groupCode === 'N1') {
      groupCounts.N1 += 1;
    } else if (groupCode === 'N2') {
      groupCounts.N2 += 1;
    } else if (groupCode === 'N3') {
      groupCounts.N3 += 1;
    } else if (groupCode === 'N4') {
      groupCounts.N4 += 1;
    } else if (groupCode === 'N5') {
      groupCounts.N5 += 1;
    }

    // Lỗi đặc biệt nghiêm trọng
    if (groupCode === 'S1') {
      seriousViolation = true;
    }
  }

  // --------------------------------------------
  // Tổng số lần vi phạm dùng để trừ HK
  // --------------------------------------------

  const totalConductPenalty =
    groupCounts.N1 +
    groupCounts.N2 +
    groupCounts.N3 +
    groupCounts.N4 +
    groupCounts.N5;

  // --------------------------------------------
  // Điểm HK mặc định = 100
  // --------------------------------------------

  const settings = await Setting.findOne();

  const maxMerit =
    settings?.maxMeritScore || 100;

  const score = Math.max(
    maxMerit - totalConductPenalty,
    0
  );

  // --------------------------------------------
  // Lưu điểm HK theo TUẦN
  // --------------------------------------------

  await StudentConductScore.findOneAndUpdate(
    {
      name,
      className,
      weekNumber: Number(weekNumber),
    },
    {
      name,
      className,
      weekNumber: Number(weekNumber),

      score,

      N1: groupCounts.N1,
      N2: groupCounts.N2,
      N3: groupCounts.N3,
      N4: groupCounts.N4,
      N5: groupCounts.N5,

      seriousViolation,

      updatedAt: new Date(),
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

// ============================================================
// XÓA BẢN GHI HẠNH KIỂM NẾU HỌC SINH KHÔNG CÒN VI PHẠM
// ============================================================

const cleanupStudentConductScore = async (
  studentName,
  className,
  weekNumber
) => {
  if (!studentName || !className || weekNumber === undefined) {
    return;
  }

  const name = normalizeName(studentName);

  const count = await Violation.countDocuments({
    name,
    className,
    weekNumber: Number(weekNumber),
  });

  if (count === 0) {
    await StudentConductScore.deleteOne({
      name,
      className,
      weekNumber: Number(weekNumber),
    });
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

exports.createViolation = async (
  req,
  res
) => {
  try {
    const {
      className,
      description,
      handlingMethod,
      handledBy,
      handlingNote,
      weekNumber,
      time,
      name: rawName,
    } = req.body;

    if (
      !rawName ||
      !description ||
      !className
    ) {
      return res.status(400).json({
        error:
          'Thiếu thông tin bắt buộc (name, description, className)',
      });
    }

    if (
      weekNumber === undefined ||
      weekNumber === null
    ) {
      return res.status(400).json({
        error: 'Thiếu weekNumber',
      });
    }

    const name = normalizeName(rawName);

    // --------------------------------------------
    // Tìm Rule
    // --------------------------------------------

    const rule = await getRuleByDescription(
      description
    );

    // --------------------------------------------
    // Điểm thi đua lớp
    //
    // LƯU Ý:
    // Đây vẫn là point của Rule.
    // Không dùng point để tính HK.
    // --------------------------------------------

    const penalty =
      rule && typeof rule.point === 'number'
        ? rule.point
        : 0;

    const violation =
      new Violation({
        name,
        className,
        description,
        penalty,

        handlingMethod:
          handlingMethod || '',

        handledBy:
          handledBy || '',

        handlingNote:
          handlingNote || '',

        handled: !!handledBy,

        weekNumber:
          Number(weekNumber),

        time: time
          ? new Date(time)
          : new Date(),
      });

    await violation.save();

    // --------------------------------------------
    // Cập nhật điểm HK của đúng tuần
    // --------------------------------------------

    await updateStudentConductScore(
      name,
      className,
      Number(weekNumber)
    );

    res.status(201).json(violation);
  } catch (error) {
    console.error(
      '❌ Lỗi khi ghi nhận vi phạm:',
      error
    );

    res.status(500).json({
      error:
        'Lỗi khi ghi nhận vi phạm',
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

exports.deleteViolation = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const violation =
      await Violation.findByIdAndDelete(id);

    if (!violation) {
      return res.status(404).json({
        error:
          'Không tìm thấy vi phạm để xoá.',
      });
    }

    // --------------------------------------------
    // Lưu lại thông tin cũ trước khi xóa
    // --------------------------------------------

    const {
      name,
      className,
      weekNumber,
    } = violation;

    // --------------------------------------------
    // Nếu vẫn còn lỗi trong tuần
    // → tính lại
    //
    // Nếu không còn lỗi
    // → xóa bản ghi HK tuần đó
    // --------------------------------------------

    await cleanupStudentConductScore(
      name,
      className,
      weekNumber
    );

    await updateStudentConductScore(
      name,
      className,
      weekNumber
    );

    res.status(200).json({
      message:
        'Đã xoá vi phạm và cập nhật điểm hạnh kiểm.',
    });
  } catch (error) {
    console.error(
      '❌ Lỗi khi xoá vi phạm:',
      error
    );

    res.status(500).json({
      error:
        'Không thể xoá vi phạm.',
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

exports.updateViolation =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        description,
        weekNumber,
        time,
        className,
        name: rawName,
      } = req.body;

      // --------------------------------------------
      // Tìm lỗi cũ
      // --------------------------------------------

      const violation =
        await Violation.findById(id);

      if (!violation) {
        return res.status(404).json({
          error:
            'Không tìm thấy vi phạm.',
        });
      }

      // --------------------------------------------
      // Lưu thông tin cũ
      // --------------------------------------------

      const oldName =
        violation.name;

      const oldClassName =
        violation.className;

      const oldWeekNumber =
        violation.weekNumber;

      // --------------------------------------------
      // Cập nhật nội dung lỗi
      // --------------------------------------------

      if (description) {
        violation.description =
          description;

        const rule =
          await getRuleByDescription(
            description
          );

        violation.penalty =
          rule &&
          typeof rule.point === 'number'
            ? rule.point
            : 0;
      }

      // --------------------------------------------
      // Cập nhật tuần
      // --------------------------------------------

      if (
        weekNumber !== undefined
      ) {
        violation.weekNumber =
          Number(weekNumber);
      }

      // --------------------------------------------
      // Cập nhật thời gian
      // --------------------------------------------

      if (time) {
        violation.time =
          new Date(time);
      }

      // --------------------------------------------
      // Cập nhật lớp
      // --------------------------------------------

      if (className) {
        violation.className =
          className;
      }

      // --------------------------------------------
      // Cập nhật học sinh
      // --------------------------------------------

      if (rawName) {
        violation.name =
          normalizeName(rawName);
      }

      await violation.save();

      // --------------------------------------------
      // Nếu thay đổi học sinh/lớp/tuần
      // → tính lại bản ghi cũ
      // --------------------------------------------

      const changedStudent =
        oldName !== violation.name;

      const changedClass =
        oldClassName !==
        violation.className;

      const changedWeek =
        Number(oldWeekNumber) !==
        Number(violation.weekNumber);

      if (
        changedStudent ||
        changedClass ||
        changedWeek
      ) {
        await cleanupStudentConductScore(
          oldName,
          oldClassName,
          oldWeekNumber
        );

        await updateStudentConductScore(
          oldName,
          oldClassName,
          oldWeekNumber
        );
      }

      // --------------------------------------------
      // Tính lại HK cho bản ghi mới
      // --------------------------------------------

      await updateStudentConductScore(
        violation.name,
        violation.className,
        violation.weekNumber
      );

      res.json({
        message:
          'Đã cập nhật vi phạm thành công.',
        violation,
      });
    } catch (error) {
      console.error(
        '❌ Lỗi khi cập nhật vi phạm:',
        error
      );

      res.status(500).json({
        error:
          'Lỗi server khi cập nhật vi phạm.',
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
