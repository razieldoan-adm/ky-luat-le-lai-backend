const mongoose = require('mongoose');

const leaveApplicationSchema = new mongoose.Schema(
  {
    // ==========================================
    // VI PHẠM GỐC
    // ==========================================

    violationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Violation',
      required: false,
      
    },

    // ==========================================
    // THÔNG TIN HỌC SINH
    // Lưu snapshot để danh sách đơn vẫn hiển thị
    // kể cả khi thông tin Violation thay đổi
    // ==========================================

    studentName: {
      type: String,
      required: true,
      trim: true,
    },

    className: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // THÔNG TIN VI PHẠM
    // ==========================================

    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    weekNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    ruleCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },

    groupCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },

    description: {
      type: String,
      default: '',
    },

    // Điểm gốc của vi phạm
    // KHÔNG thay đổi khi nộp đơn
    originalPenalty: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // TRẠNG THÁI ĐƠN
    //
    // PENDING  : chờ xử lý
    // APPROVED : được duyệt -> không tính vi phạm
    // REJECTED : từ chối -> tính vi phạm
    // OVERDUE  : quá hạn -> tính lại vi phạm
    // ==========================================

    status: {
      type: String,
      enum: [
        'PENDING',
        'APPROVED',
        'REJECTED',
        'OVERDUE',
      ],
      default: 'PENDING',
      index: true,
    },

    // ==========================================
    // THỜI GIAN
    // ==========================================

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    // Hạn nộp / hạn xử lý đơn
    //
    // Chưa tự ý quy định số ngày.
    // Sau này có thể lấy từ Setting.
    deadlineAt: {
      type: Date,
      default: null,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    // ==========================================
    // NGƯỜI XỬ LÝ
    // ==========================================

    processedBy: {
      type: String,
      default: '',
      trim: true,
    },

    // ==========================================
    // GHI CHÚ
    // ==========================================

    note: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// INDEX
// ==========================================

leaveApplicationSchema.index({
  studentName: 1,
  className: 1,
  academicYear: 1,
  weekNumber: 1,
});

leaveApplicationSchema.index({
  status: 1,
  deadlineAt: 1,
});

// Một Violation chỉ có một đơn đang quản lý
leaveApplicationSchema.index(
  {
    violationId: 1,
  },
  {
    unique: true,
    sparse: true,
  }
);

module.exports = mongoose.model(
  'LeaveApplication',
  leaveApplicationSchema
);
