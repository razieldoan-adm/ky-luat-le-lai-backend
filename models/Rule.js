const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema(
  {
    // ==========================================
    // NHÓM LỖI
    // Dùng để phân nhóm CB1 và tính điểm hạnh kiểm
    // Ví dụ: N1, N2, N3, N4
    // ==========================================
    groupCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    groupName: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // MÃ LỖI CỤ THỂ
    // Ví dụ: N1-01, N1-02...
    // ==========================================
    ruleCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    // ==========================================
    // TÊN LỖI
    // ==========================================
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // ĐIỂM TRỪ THI ĐUA/KỶ LUẬT LỚP
    // Giữ nguyên cách tính cũ
    // ==========================================
    point: {
      type: Number,
      required: true,
      default: 1,
    },

    // ==========================================
    // GHI CHÚ / MÔ TẢ
    // ==========================================
    content: {
      type: String,
      default: '',
      trim: true,
    },

    // ==========================================
    // TRẠNG THÁI LỖI
    // true  = đang sử dụng
    // false = ngừng sử dụng
    // ==========================================
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// INDEX
// Tìm lỗi theo nhóm nhanh
// ==========================================
ruleSchema.index({
  groupCode: 1,
  active: 1,
});

// Mỗi mã lỗi chỉ được xuất hiện 1 lần
ruleSchema.index(
  {
    ruleCode: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model('Rule', ruleSchema);
