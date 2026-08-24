const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // =====================================================
    // NGƯỜI THỰC HIỆN
    // =====================================================

    userId: {
      type: String,
      default: "",
      index: true,
    },

    username: {
      type: String,
      default: "",
      index: true,
    },

    role: {
      type: String,
      default: "",
    },

    // =====================================================
    // HÀNH ĐỘNG
    // CREATE / UPDATE / DELETE
    // =====================================================

    action: {
      type: String,
      required: true,
      enum: ["CREATE", "UPDATE", "DELETE"],
      index: true,
    },

    // =====================================================
    // MODULE
    // =====================================================

    module: {
      type: String,
      required: true,
      index: true,
    },

    // =====================================================
    // ĐỐI TƯỢNG BỊ THAY ĐỔI
    // =====================================================

    targetId: {
      type: String,
      default: "",
      index: true,
    },

    // =====================================================
    // THÔNG TIN HỌC SINH
    // =====================================================

    studentName: {
      type: String,
      default: "",
      index: true,
    },

    className: {
      type: String,
      default: "",
      index: true,
    },

    academicYear: {
      type: String,
      default: "",
      index: true,
    },

    weekNumber: {
      type: Number,
      default: null,
      index: true,
    },

    // =====================================================
    // DỮ LIỆU TRƯỚC KHI THAY ĐỔI
    // =====================================================

    beforeData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // =====================================================
    // DỮ LIỆU SAU KHI THAY ĐỔI
    // =====================================================

    afterData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({
  module: 1,
  createdAt: -1,
});

auditLogSchema.index({
  username: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "AuditLog",
  auditLogSchema
);
