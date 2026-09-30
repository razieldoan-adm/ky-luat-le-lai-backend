const LeaveApplication = require("../models/LeaveApplication");
const Violation = require("../models/Violation");
const Rule = require("../models/Rule");
const createAuditLog = require("../utils/createAuditLog");
const { updateStudentConductScore,} = require("./violationController");
// ============================================================
// 📋 LẤY DANH SÁCH VI PHẠM CÓ THỂ NỘP ĐƠN
// ============================================================

exports.getEligibleViolations = async (req, res) => {
  try {
    const {
      name,
      className,
      academicYear,
      weekNumber,
    } = req.query;

    const filter = {};

    if (name) {
      filter.name = name;
    }

    if (className) {
      filter.className = className;
    }

    if (academicYear) {
      filter.academicYear = academicYear;
    }

    if (weekNumber) {
      filter.weekNumber = Number(weekNumber);
    }

    const violations =
      await Violation.find(filter)
        .sort({ time: -1 })
        .lean();

    // Lấy các vi phạm đã có đơn
    const violationIds =
      violations.map(
        (item) => item._id
      );

    const applications =
      await LeaveApplication.find({
        violationId: {
          $in: violationIds,
        },
      }).lean();

    const applicationMap =
      new Map(
        applications.map((item) => [
          String(item.violationId),
          item,
        ])
      );

    // Gắn thông tin đơn vào từng vi phạm
    const result =
      violations.map((violation) => {
        const application =
          applicationMap.get(
            String(violation._id)
          );

        return {
          ...violation,
          application:
            application || null,
        };
      });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "❌ Lỗi getEligibleViolations:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Không thể lấy danh sách vi phạm",
      error: error.message,
    });
  }
};

// ============================================================
// 📝 TẠO ĐƠN XIN PHÉP
// ============================================================

// ============================================================
// 📝 TẠO ĐƠN XIN PHÉP TỪ VI PHẠM
//
// Frontend chỉ cần gửi:
// {
//   violationId,
//   isException
// }
//
// Backend tự lấy đầy đủ thông tin từ Violation + Rule
// ============================================================

exports.createApplication = async (req, res) => {
  try {
    const {
      violationId,
      deadlineAt,
      note = '',
      isException = false,
    } = req.body;

    // --------------------------------------------------------
    // 1. Kiểm tra violationId
    // --------------------------------------------------------

    if (!violationId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu violationId.',
      });
    }

    // --------------------------------------------------------
    // 2. Tìm Violation
    // --------------------------------------------------------

    const violation = await Violation.findById(violationId);

    if (!violation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vi phạm.',
      });
    }

    // --------------------------------------------------------
    // 3. Kiểm tra vi phạm đã có đơn chưa
    // --------------------------------------------------------

    const existingApplication =
      await LeaveApplication.findOne({
        violationId: violation._id,
      });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'Vi phạm này đã có đơn xin phép.',
        data: existingApplication,
      });
    }

    // --------------------------------------------------------
    // 4. Lấy thông tin cơ bản từ Violation
    // --------------------------------------------------------

    const studentName = String(
      violation.name || ''
    ).trim();

    const className = String(
      violation.className || ''
    ).trim();

    const academicYear = String(
      violation.academicYear || ''
    ).trim();

    const weekNumber = Number(
      violation.weekNumber || 0
    );

    const ruleCode = String(
      violation.ruleCode || ''
    ).trim().toUpperCase();

    const groupCode = String(
      violation.groupCode || ''
    ).trim().toUpperCase();

    if (!studentName || !className) {
      return res.status(400).json({
        success: false,
        message: 'Vi phạm thiếu tên học sinh hoặc lớp.',
      });
    }

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Vi phạm thiếu năm học.',
      });
    }

    if (!weekNumber) {
      return res.status(400).json({
        success: false,
        message: 'Vi phạm thiếu tuần học.',
      });
    }

    if (!ruleCode) {
      return res.status(400).json({
        success: false,
        message: 'Vi phạm thiếu ruleCode.',
      });
    }

    // --------------------------------------------------------
    // 5. Tìm Rule
    // --------------------------------------------------------

    const rule = await Rule.findOne({
      ruleCode,
      active: true,
    });

    if (!rule) {
      return res.status(400).json({
        success: false,
        message:
          'Không tìm thấy nội dung vi phạm tương ứng hoặc nội dung đã bị tắt.',
        ruleCode,
      });
    }

    // --------------------------------------------------------
    // 6. Chuẩn hóa groupCode
    // --------------------------------------------------------

    const normalizedGroupCode = String(
      groupCode || rule.groupCode || ''
    )
      .trim()
      .toUpperCase();

    // --------------------------------------------------------
    // 7. Điểm phạt lấy trực tiếp từ Rule
    // Không lấy điểm từ frontend
    // --------------------------------------------------------

    const penalty = Number(rule.point) || 0;

    // --------------------------------------------------------
    // 8. Kiểm tra PENDING cùng vi phạm
    // --------------------------------------------------------

    const pendingApplication =
      await LeaveApplication.findOne({
        studentName,
        className,
        academicYear,
        weekNumber,
        ruleCode: rule.ruleCode,
        status: 'PENDING',
        violationId: violation._id,
      });

    if (pendingApplication) {
      return res.status(400).json({
        success: false,
        message:
          'Vi phạm này đã có đơn đang chờ duyệt.',
        data: pendingApplication,
      });
    }

    // --------------------------------------------------------
    // 9. ĐẾM SỐ LẦN NỘP TRONG THÁNG
    //
    // Cùng:
    // - học sinh
    // - lớp
    // - năm học
    // - ruleCode
    //
    // Giống cơ chế Tạo đơn trực tiếp
    // --------------------------------------------------------

    const submittedAt = new Date();

    const startOfMonth = new Date(
      submittedAt.getFullYear(),
      submittedAt.getMonth(),
      1
    );

    const startOfNextMonth = new Date(
      submittedAt.getFullYear(),
      submittedAt.getMonth() + 1,
      1
    );

    const submissionCount =
      await LeaveApplication.countDocuments({
        studentName,
        className,
        academicYear,
        ruleCode: rule.ruleCode,

        submittedAt: {
          $gte: startOfMonth,
          $lt: startOfNextMonth,
        },
      });

    const submissionNumber =
      submissionCount + 1;

    console.log(
      `🔢 ${studentName} - ${rule.ruleCode}: Nộp lần ${submissionNumber}`
    );

    // --------------------------------------------------------
    // 10. Giới hạn 2 lần/tháng
    //
    // Nếu frontend chưa cho phép ngoại lệ thì chặn.
    // --------------------------------------------------------

    const submissionLimit = 2;

    if (
      submissionNumber > submissionLimit &&
      !Boolean(isException)
    ) {
      return res.status(400).json({
        success: false,
        code: 'SUBMISSION_LIMIT_REACHED',
        message:
          `Học sinh đã nộp ${submissionCount} lần trong tháng cho lỗi này. Đã vượt giới hạn ${submissionLimit} lần.`,
        submissionCount,
        submissionNumber,
        submissionLimit,
      });
    }

    // --------------------------------------------------------
    // 11. Tạo đơn
    // --------------------------------------------------------

    const application =
      await LeaveApplication.create({
        violationId: violation._id,

        studentName,
        className,
        academicYear,
        weekNumber,

        ruleCode: rule.ruleCode,
        groupCode: normalizedGroupCode,
        description: rule.title,

        originalPenalty: penalty,

        status: 'PENDING',

        submittedAt,

        deadlineAt: deadlineAt
          ? new Date(deadlineAt)
          : null,

        submissionNumber,

        isException: Boolean(isException),

        note: String(note || '').trim(),
      });

    // --------------------------------------------------------
    // 12. Trả kết quả
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: 'Đã tạo đơn xin phép từ vi phạm.',
      data: application,
    });

  } catch (error) {
    console.error(
      '❌ Lỗi createApplication:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Không thể tạo đơn xin phép.',
      error: error.message,
    });
  }
};

// ============================================================
// 📝 TẠO ĐƠN XIN PHÉP TRỰC TIẾP
//
// Luồng:
// Học sinh -> PENDING
// Chưa tạo Violation
// violationId để trống
// ============================================================

exports.createDirectApplication = async (req, res) => {
  try {
    const {
      studentName,
      className,
      academicYear,
      weekNumber,
      ruleCode,
      groupCode,
      description,
      originalPenalty,
      note = '',
    } = req.body;

    // --------------------------------------------------------
    // Kiểm tra dữ liệu bắt buộc
    // --------------------------------------------------------

    if (!studentName || !className) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tên học sinh hoặc lớp.',
      });
    }

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu năm học.',
      });
    }

    if (!weekNumber) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tuần học.',
      });
    }

    if (!ruleCode) {
      return res.status(400).json({
        success: false,
        message: 'Chưa chọn nội dung vi phạm.',
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu nội dung vi phạm.',
      });
    }

    // --------------------------------------------------------
    // Kiểm tra rule có tồn tại và đang active
    // --------------------------------------------------------

    const Rule = require('../models/Rule');

    const rule = await Rule.findOne({
      ruleCode: String(ruleCode).trim().toUpperCase(),
      active: true,
    });

    if (!rule) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung vi phạm không hợp lệ hoặc đã bị tắt.',
      });
    }

    // --------------------------------------------------------
    // Kiểm tra ruleCode có đúng groupCode không
    // --------------------------------------------------------

    const normalizedGroupCode = String(
      groupCode || rule.groupCode || ''
    )
      .trim()
      .toUpperCase();

    // --------------------------------------------------------
    // Điểm phạt lấy từ Rule
    // Không tin điểm do frontend gửi lên
    // --------------------------------------------------------

    const penalty = Number(rule.point) || 0;

    // --------------------------------------------------------
    // Kiểm tra đã có đơn PENDING cho học sinh + lỗi + tuần chưa
    // --------------------------------------------------------

    const existingApplication =
      await LeaveApplication.findOne({
        studentName: studentName.trim(),
        className: className.trim(),
        academicYear: academicYear.trim(),
        weekNumber: Number(weekNumber),
        ruleCode: rule.ruleCode,
        status: 'PENDING',
        violationId: { $exists: false },
      });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message:
          'Học sinh này đã có đơn xin phép đang chờ duyệt cho lỗi này.',
        data: existingApplication,
      });
    }


    // --------------------------------------------------------
// XÁC ĐỊNH SỐ LẦN NỘP TRONG THÁNG
// Cùng học sinh + lớp + năm học + lỗi
// --------------------------------------------------------

const submittedAt = new Date();

const startOfMonth = new Date(
  submittedAt.getFullYear(),
  submittedAt.getMonth(),
  1
);

const startOfNextMonth = new Date(
  submittedAt.getFullYear(),
  submittedAt.getMonth() + 1,
  1
);

const submissionCount =
  await LeaveApplication.countDocuments({
    studentName: studentName.trim(),
    className: className.trim(),
    academicYear: academicYear.trim(),
    ruleCode: rule.ruleCode,

    submittedAt: {
      $gte: startOfMonth,
      $lt: startOfNextMonth,
    },
  });

const submissionNumber = submissionCount + 1;

console.log(
  `🔢 ${studentName} - ${rule.ruleCode}: Nộp lần ${submissionNumber}`
);
    // --------------------------------------------------------
    // TẠO ĐƠN
    //
    // Quan trọng:
    // KHÔNG có violationId
    // KHÔNG tạo Violation
    // --------------------------------------------------------

const application = await LeaveApplication.create({
  studentName: studentName.trim(),
  className: className.trim(),
  academicYear: academicYear.trim(),
  weekNumber: Number(weekNumber),

  ruleCode: rule.ruleCode,
  groupCode: normalizedGroupCode,
  description: rule.title,

  originalPenalty: penalty,

  status: 'PENDING',

  submittedAt,

  // 🔢 Lưu cố định thứ tự lần nộp
  submissionNumber,

  note: String(note || '').trim(),
});
    return res.status(201).json({
      success: true,
      message: 'Đã nộp đơn xin phép trực tiếp.',
      data: application,
    });
  } catch (error) {
    console.error(
      '❌ Lỗi createDirectApplication:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Không thể tạo đơn xin phép trực tiếp.',
      error: error.message,
    });
  }
};
// ============================================================
// 📋 LẤY DANH SÁCH ĐƠN
// ============================================================

exports.getApplications = async (
  req,
  res
) => {
  try {
    const {
      status,
      className,
      academicYear,
      weekNumber,
      studentName,
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (className) {
      filter.className = className;
    }

    if (academicYear) {
      filter.academicYear =
        academicYear;
    }

    if (weekNumber) {
      filter.weekNumber =
        Number(weekNumber);
    }

    if (studentName) {
      filter.studentName =
        studentName;
    }

    const applications =
      await LeaveApplication.find(
        filter
      )
        .populate("violationId")
        .sort({
          submittedAt: -1,
        });

const data = applications.map((app) => {
  const submissionNumber =
    Number(app.submissionNumber) || 1;

  return {
    ...app.toObject(),

    // 🔢 Số lần nộp cố định của chính đơn này
    submissionNumber,

    submissionLabel:
      `Nộp lần ${submissionNumber}`,

    submissionLimit: 2,

    submissionLimitReached:
      submissionNumber >= 2,

    submissionLimitExceeded:
      submissionNumber > 2,
  };
});

res.json({
  success: true,
  data,
});
    
  } catch (error) {
    console.error(
      "❌ Lỗi getApplications:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Không thể lấy danh sách đơn",
      error: error.message,
    });
  }
};

// ============================================================
// 👁️ XEM CHI TIẾT ĐƠN
// ============================================================

exports.getApplicationById =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const application =
        await LeaveApplication.findById(
          id
        ).populate(
          "violationId"
        );

      if (!application) {
        return res.status(404).json({
          success: false,
          message:
            "Không tìm thấy đơn",
        });
      }

      res.json({
        success: true,
        data: application,
      });
    } catch (error) {
      console.error(
        "❌ Lỗi getApplicationById:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Không thể lấy chi tiết đơn",
        error: error.message,
      });
    }
  };

// ============================================================
// 🗑️ XÓA ĐƠN XIN PHÉP
// Chỉ xóa LeaveApplication
// KHÔNG xóa Violation
// ============================================================

exports.deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await LeaveApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn xin phép",
      });
    }

    // Chỉ xóa đơn xin phép.
    // Nếu đơn đã có violationId thì Violation vẫn được giữ nguyên.
    await LeaveApplication.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Đã xóa đơn xin phép",
    });
  } catch (error) {
    console.error("❌ Lỗi deleteApplication:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa đơn xin phép",
      error: error.message,
    });
  }
};
// ============================================================
// ✅ DUYỆT ĐƠN
// ============================================================

exports.approveApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await LeaveApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn",
      });
    }

    if (application.status === "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Đơn này đã được duyệt",
      });
    }

    if (application.status === "OVERDUE") {
      return res.status(400).json({
        success: false,
        message: "Đơn đã quá hạn, không thể duyệt",
      });
    }

    // Lấy người duyệt từ tài khoản đang đăng nhập
    const processedBy =
      req.user?.username ||
      req.user?.name ||
      req.user?.email ||
      "";

    application.status = "APPROVED";
    application.processedAt = new Date();
    application.processedBy = processedBy;

    // Khi duyệt không bắt buộc phải có ghi chú
    application.note = application.note || "";

    await application.save();

    return res.json({
      success: true,
      message: "Đã duyệt đơn xin phép",
      data: application,
    });
  } catch (error) {
    console.error("❌ Lỗi approveApplication:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể duyệt đơn",
      error: error.message,
    });
  }
};

    // ============================================================
    // ❌ TỪ CHỐI ĐƠN
    // ============================================================
    
    exports.rejectApplication =
      async (req, res) => {
        try {
          const { id } =
            req.params;
    
          const {
            processedBy = "",
            note = "",
          } = req.body;
    
          const application =
            await LeaveApplication.findById(
              id
            );
    
          console.log("🔴 REJECT APPLICATION:", {
      id,
      studentName: application?.studentName,
      className: application?.className,
      ruleCode: application?.ruleCode,
      groupCode: application?.groupCode,
      academicYear: application?.academicYear,
      weekNumber: application?.weekNumber,
      violationId: application?.violationId,
    });
          
          if (!application) {
            return res.status(404).json({
              success: false,
              message:
                "Không tìm thấy đơn",
            });
          }
    
          // Nếu là đơn xin phép trực tiếp thì chưa có violationId.
          // Khi bị từ chối -> tạo Violation như một vi phạm bình thường.
    
    
          if (!application.violationId) {
      console.log(
        "🟡 Đơn trực tiếp chưa có Violation → chuẩn bị tạo Violation"
      );
    
      // --------------------------------------------------------
      // Lấy Rule giống luồng POST /api/violations
      // --------------------------------------------------------
    
      const rule = await Rule.findOne({
        ruleCode: String(application.ruleCode || "")
          .trim()
          .toUpperCase(),
        active: true,
      });
    
      if (!rule) {
        return res.status(400).json({
          success: false,
          message:
            "Không tìm thấy quy định vi phạm hoặc quy định đã bị tắt.",
        });
      }
    
      const normalizedClass = String(
        application.className || ""
      )
        .trim()
        .toUpperCase();
    
      const normalizedName = String(
        application.studentName || ""
      )
        .trim()
        .toLowerCase();
    
      const normalizedGroupCode = String(
        application.groupCode || rule.groupCode || ""
      )
        .trim()
        .toUpperCase();
    
      // --------------------------------------------------------
      // Tạo Violation
      // Điểm phạt lấy từ Rule, không lấy từ frontend
      // --------------------------------------------------------
    
      const violation = new Violation({
        name: normalizedName,
        className: normalizedClass,
        description:
          application.description || rule.title,
        ruleCode: rule.ruleCode,
        groupCode: normalizedGroupCode,
        academicYear: String(
          application.academicYear
        ).trim(),
        penalty:
          typeof rule.point === "number"
            ? rule.point
            : 0,
        handlingMethod: "",
        handledBy: "",
        handlingNote: "",
        handled: false,
        weekNumber: Number(
          application.weekNumber
        ),
        time: new Date(),
      });
    
      await violation.save();
    
      console.log(
        "🟢 ĐÃ TẠO VIOLATION:",
        violation._id
      );
    
      // --------------------------------------------------------
      // Ghi lịch sử tạo Violation
      // --------------------------------------------------------
    
      await createAuditLog({
        req,
    
        action: "CREATE",
    
        module: "VIOLATION",
    
        targetId: violation._id,
    
        studentName: violation.name,
    
        className: violation.className,
    
        academicYear: violation.academicYear,
    
        weekNumber: violation.weekNumber,
    
        beforeData: null,
    
        afterData: violation.toObject(),
      });
    
      // --------------------------------------------------------
      // Cập nhật hạnh kiểm
      // --------------------------------------------------------
    
      await updateStudentConductScore(
        violation.name,
        violation.className,
        violation.academicYear,
        violation.weekNumber
      );
    
      // --------------------------------------------------------
      // Liên kết đơn với Violation vừa tạo
      // --------------------------------------------------------
    
      application.violationId = violation._id;
    }

      application.status = "REJECTED";
      application.processedAt = new Date();
      application.processedBy = processedBy;
      application.note = note;

      await application.save();

      res.json({
        success: true,
        message:
          "Đã từ chối đơn xin phép",
        data: application,
      });
    } catch (error) {
      console.error(
        "❌ Lỗi rejectApplication:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Không thể từ chối đơn",
        error: error.message,
      });
    }
  };

// ============================================================
// ⏰ CHUYỂN ĐƠN SANG QUÁ HẠN
// ============================================================

exports.markApplicationOverdue =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const application =
        await LeaveApplication.findById(
          id
        );

      if (!application) {
        return res.status(404).json({
          success: false,
          message:
            "Không tìm thấy đơn",
        });
      }

      application.status =
        "OVERDUE";

      application.processedAt =
        new Date();

      await application.save();

      res.json({
        success: true,
        message:
          "Đơn đã chuyển sang trạng thái quá hạn",
        data: application,
      });
    } catch (error) {
      console.error(
        "❌ Lỗi markApplicationOverdue:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Không thể chuyển đơn sang quá hạn",
        error: error.message,
      });
    }
  };
// ============================================================
// 🔢 ĐẾM SỐ LẦN HỌC SINH ĐÃ NỘP CÙNG MỘT LỖI TRONG THÁNG
// ============================================================

exports.getMonthlySubmissionCount = async (req, res) => {
  try {
    const {
      studentName,
      className,
      academicYear,
      ruleCode,
      month,
      year,
    } = req.query;

    if (
      !studentName ||
      !className ||
      !academicYear ||
      !ruleCode
    ) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin để kiểm tra số lần nộp đơn.',
      });
    }

    const now = new Date();

    const targetMonth = Number(month) || now.getMonth() + 1;
    const targetYear = Number(year) || now.getFullYear();

    const startDate = new Date(
      targetYear,
      targetMonth - 1,
      1,
      0,
      0,
      0,
      0
    );

    const endDate = new Date(
      targetYear,
      targetMonth,
      1,
      0,
      0,
      0,
      0
    );

    const normalizedName = String(studentName)
      .trim();

    const normalizedClass = String(className)
      .trim();

    const normalizedRuleCode = String(ruleCode)
      .trim()
      .toUpperCase();

    const count = await LeaveApplication.countDocuments({
      studentName: normalizedName,
      className: normalizedClass,
      academicYear: String(academicYear).trim(),
      ruleCode: normalizedRuleCode,

      submittedAt: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    const limit = 2;

    return res.json({
      success: true,
      data: {
        count,
        nextSubmissionNumber: count + 1,
        limit,
        exceeded: count >= limit,
        month: targetMonth,
        year: targetYear,
      },
    });
  } catch (error) {
    console.error(
      '❌ Lỗi getMonthlySubmissionCount:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Không thể kiểm tra số lần nộp đơn.',
      error: error.message,
    });
  }
};
