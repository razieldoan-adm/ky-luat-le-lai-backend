const LeaveApplication = require("../models/LeaveApplication");
const Violation = require("../models/Violation");

const {
  updateStudentConductScore,
} = require("./violationController");

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

exports.createApplication = async (
  req,
  res
) => {
  try {
    const {
      violationId,
      deadlineAt,
      note,
    } = req.body;

    if (!violationId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu violationId",
      });
    }

    // Tìm vi phạm
    const violation =
      await Violation.findById(
        violationId
      );

    if (!violation) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy vi phạm",
      });
    }

    // Kiểm tra đã có đơn chưa
    const existingApplication =
      await LeaveApplication.findOne({
        violationId:
          violation._id,
      });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message:
          "Vi phạm này đã có đơn xin phép",
        application:
          existingApplication,
      });
    }

    const application =
      await LeaveApplication.create({
        violationId:
          violation._id,

        studentName:
          violation.name,

        className:
          violation.className,

        academicYear:
          violation.academicYear,

        weekNumber:
          violation.weekNumber,

        ruleCode:
          violation.ruleCode,

        groupCode:
          violation.groupCode,

        description:
          violation.description,

        originalPenalty:
          violation.penalty || 0,

        status: "PENDING",

        submittedAt:
          new Date(),

        deadlineAt:
          deadlineAt
            ? new Date(
                deadlineAt
              )
            : null,

        note: note || "",
      });

    res.status(201).json({
      success: true,
      message:
        "Nộp đơn xin phép thành công",
      data: application,
    });
  } catch (error) {
    console.error(
      "❌ Lỗi createApplication:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Không thể tạo đơn xin phép",
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

    res.json({
      success: true,
      data: applications,
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
// ✅ DUYỆT ĐƠN
// ============================================================

exports.approveApplication =
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

      if (!application) {
        return res.status(404).json({
          success: false,
          message:
            "Không tìm thấy đơn",
        });
      }

      if (
        application.status ===
        "APPROVED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Đơn này đã được duyệt",
        });
      }

      if (
        application.status ===
        "OVERDUE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Đơn đã quá hạn, không thể duyệt",
        });
      }

      application.status =
        "APPROVED";

      application.processedAt =
        new Date();

      application.processedBy =
        processedBy;

      application.note =
        note;

      await application.save();

      // APPROVED → không tính vi phạm
      const violation =
        await Violation.findById(
          application.violationId
        );

      

      res.json({
        success: true,
        message:
          "Đã duyệt đơn xin phép",
        data: application,
      });
    } catch (error) {
      console.error(
        "❌ Lỗi approveApplication:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Không thể duyệt đơn",
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

      if (!application) {
        return res.status(404).json({
          success: false,
          message:
            "Không tìm thấy đơn",
        });
      }

      application.status =
        "REJECTED";

      application.processedAt =
        new Date();

      application.processedBy =
        processedBy;

      application.note =
        note;

      await application.save();

      // REJECTED → vẫn tính vi phạm
      const violation =
        await Violation.findById(
          application.violationId
        );

      

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

      // OVERDUE → tính lại điểm
      // Violation gốc vẫn còn
      const violation =
        await Violation.findById(
          application.violationId
        );

      

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
