const AuditLog = require("../models/AuditLog");

const createAuditLog = async ({
  req,
  action,
  module,
  targetId,
  studentName,
  className,
  academicYear,
  weekNumber,
  beforeData = null,
  afterData = null,
}) => {
  try {
    const user = req.user || {};

    const auditLog = await AuditLog.create({
      userId:
        user.id ||
        user._id ||
        user.userId ||
        "",

      username:
        user.username ||
        user.name ||
        "",

      role:
        user.role ||
        "",

      action,
      module,

      targetId: targetId
        ? String(targetId)
        : "",

      studentName:
        studentName || "",

      className:
        className || "",

      academicYear:
        academicYear || "",

      weekNumber:
        weekNumber !== undefined &&
        weekNumber !== null
          ? Number(weekNumber)
          : null,

      beforeData,
      afterData,
    });

    console.log(
      "📝 AUDIT LOG:",
      {
        id: auditLog._id,
        username: auditLog.username,
        action: auditLog.action,
        module: auditLog.module,
        targetId: auditLog.targetId,
      }
    );

    return auditLog;
  } catch (error) {
    console.error(
      "❌ LỖI GHI AUDIT LOG:",
      error
    );

    return null;
  }
};

module.exports = createAuditLog;
