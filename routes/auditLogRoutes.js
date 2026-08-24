const express = require("express");

const router = express.Router();

const controller =
  require("../controllers/auditLogController");

const {
  verifyToken,
} = require("../middlewares/authMiddleware");

router.get(
  "/violations",
  verifyToken,
  controller.getViolationAuditLogs
);

module.exports = router;
