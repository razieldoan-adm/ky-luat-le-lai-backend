const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema(
  {
    // ==========================================
    // HỌC SINH
    // ==========================================

    name: {
      type: String,
      required: true,
    },

    className: {
      type: String,
      required: true,
    },

    // ==========================================
    // NHÓM LỖI - CBB1
    //
    // N1 -> N5: tính điểm hạnh kiểm
    // S1: đặc biệt nghiêm trọng
    // ==========================================

    groupCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    groupName: {
      type: String,
      default: '',
      trim: true,
    },

    // ==========================================
    // MÃ LỖI - CBB2
    //
    // Ví dụ:
    // N1-01
    // N2-05
    // S1-01
    // ==========================================

    ruleCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    // ==========================================
    // NỘI DUNG LỖI
    // ==========================================

    description: {
      type: String,
      default: '',
    },

    // ==========================================
    // ĐIỂM TRỪ THI ĐUA LỚP
    //
    // Lấy theo Rule.point
    //
    // Ví dụ:
    // Rule.point = 5
    // → lớp bị trừ 5 điểm
    // ==========================================

    penalty: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // HÌNH THỨC XỬ LÝ
    // ==========================================

    handlingMethod: {
      type: String,
      default: '',
    },

    // ==========================================
    // ĐÃ XỬ LÝ HAY CHƯA
    // ==========================================

    handled: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // NGƯỜI XỬ LÝ
    // ==========================================

    handledBy: {
      type: String,
      enum: ['GVCN', 'PGT', ''],
      default: '',
    },

    // ==========================================
    // GHI CHÚ XỬ LÝ
    // ==========================================

    handlingNote: {
      type: String,
      default: '',
    },

    // ==========================================
    // TUẦN HỌC
    // ==========================================

    weekNumber: {
      type: Number,
      required: true,
    },

    // ==========================================
    // THỜI GIAN VI PHẠM
    // ==========================================

    time: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// INDEX
// ==========================================

// Tìm lỗi theo học sinh + tuần
violationSchema.index({
  name: 1,
  className: 1,
  weekNumber: 1,
});

// Tìm lỗi theo nhóm
violationSchema.index({
  groupCode: 1,
  weekNumber: 1,
});

// Tìm lỗi theo mã lỗi
violationSchema.index({
  ruleCode: 1,
  weekNumber: 1,
});

module.exports = mongoose.model(
  'Violation',
  violationSchema
);
