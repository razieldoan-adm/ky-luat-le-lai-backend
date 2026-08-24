const AuditLog = require("../models/AuditLog");

// ==========================================================
// LẤY CÁC THAY ĐỔI CỦA DANH SÁCH VI PHẠM
// ==========================================================

exports.getViolationAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({
      module: "VIOLATION",
      action: {
        $in: ["CREATE", "UPDATE", "DELETE"],
      },
    })
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
