const AuditLog = require("../models/AuditLog");

// ==========================================================
// LẤY CÁC THAY ĐỔI CỦA DANH SÁCH VI PHẠM
// ==========================================================

exports.getViolationAuditLogs = async (req, res) => {
  try {
    const { weekNumber, className } = req.query;

    const filter = {
      module: "VIOLATION",
      action: {
        $in: ["CREATE", "UPDATE", "DELETE"],
      },

      ...(weekNumber !== undefined &&
        weekNumber !== ""
        ? {
            weekNumber: Number(weekNumber),
          }
        : {}),

      ...(className !== undefined &&
        className !== ""
        ? {
            className: className,
          }
        : {}),
    };

    console.log(
      "🔎 AUDIT LOG FILTER:",
      filter
    );

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      logs,
      count: logs.length,
    });

  } catch (error) {
    console.error(
      "❌ LỖI LẤY AUDIT LOG:",
      error
    );

    return res.status(500).json({
      message:
        "Lỗi server khi lấy lịch sử thay đổi.",
    });
  }
};
