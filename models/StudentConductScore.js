const mongoose = require('mongoose');

const studentConductScoreSchema = new mongoose.Schema(
  {
    // ==========================================
    // HỌC SINH
    // ==========================================

    name: {
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
    // NĂM HỌC
    // Ví dụ: 2026-2027
    // ==========================================

    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // TUẦN HỌC
    // ==========================================

    weekNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    // ==========================================
    // ĐIỂM HẠNH KIỂM
    // Mỗi tuần bắt đầu 100
    // ==========================================

    maxScore: {
      type: Number,
      default: 100,
    },

    // ==========================================
    // SỐ LẦN VI PHẠM THEO NHÓM
    // N1-N5: tính điểm
    // S1: đặc biệt nghiêm trọng, không trừ điểm
    // ==========================================

    groupViolations: {
      N1: {
        type: Number,
        default: 0,
        min: 0,
      },

      N2: {
        type: Number,
        default: 0,
        min: 0,
      },

      N3: {
        type: Number,
        default: 0,
        min: 0,
      },

      N4: {
        type: Number,
        default: 0,
        min: 0,
      },

      N5: {
        type: Number,
        default: 0,
        min: 0,
      },

      S1: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // ==========================================
    // TỔNG SỐ LẦN VI PHẠM TÍNH HẠNH KIỂM
    //
    // N1 + N2 + N3 + N4 + N5
    //
    // KHÔNG tính S1
    // ==========================================

    totalConductViolations: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // TỔNG ĐIỂM BỊ TRỪ
    //
    // Mỗi lỗi N1-N5 = 1 điểm
    // ==========================================

    totalDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // ĐIỂM HẠNH KIỂM CUỐI TUẦN
    //
    // 100 - totalDeduction
    // ==========================================

    finalScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },

    // ==========================================
    // LỖI ĐẶC BIỆT NGHIÊM TRỌNG
    //
    // S1 > 0 thì dùng để xét hạ trực tiếp
    // 1 bậc hạnh kiểm.
    // ==========================================

    hasSeriousViolation: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // TRẠNG THÁI
    //
    // DRAFT: đang trong tuần
    // FINAL: đã chốt tuần
    // ==========================================

    status: {
      type: String,
      enum: ['DRAFT', 'FINAL'],
      default: 'DRAFT',
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// MỖI HS CHỈ CÓ 1 BẢN GHI / 1 TUẦN / 1 NĂM HỌC
// ==========================================

studentConductScoreSchema.index(
  {
    name: 1,
    className: 1,
    academicYear: 1,
    weekNumber: 1,
  },
  {
    unique: true,
  }
);

// ==========================================
// TÌM THEO LỚP + TUẦN
// ==========================================

studentConductScoreSchema.index({
  className: 1,
  academicYear: 1,
  weekNumber: 1,
});

// ==========================================
// TÌM THEO TUẦN
// ==========================================

studentConductScoreSchema.index({
  academicYear: 1,
  weekNumber: 1,
});

module.exports = mongoose.model(
  'StudentConductScore',
  studentConductScoreSchema
);
