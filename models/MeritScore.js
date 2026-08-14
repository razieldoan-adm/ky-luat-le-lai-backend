const mongoose = require('mongoose');

const meritScoreSchema = new mongoose.Schema(
  {
    // Học sinh
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // Lớp - dùng cùng với tên để xác định học sinh
    className: {
      type: String,
      required: true,
      trim: true,
    },

    // Tuần học
    weekNumber: {
      type: Number,
      required: true,
    },

    // Số lần vi phạm từng nhóm
    N1: {
      type: Number,
      default: 0,
    },

    N2: {
      type: Number,
      default: 0,
    },

    N3: {
      type: Number,
      default: 0,
    },

    N4: {
      type: Number,
      default: 0,
    },

    N5: {
      type: Number,
      default: 0,
    },

    // Điểm hạnh kiểm tuần
    // Mỗi lần vi phạm N1-N5 = trừ 1 điểm
    meritscore: {
      type: Number,
      required: true,
      default: 100,
    },

    // Lỗi đặc biệt nghiêm trọng
    // Không trừ điểm, chỉ dùng để xét hạ trực tiếp 1 bậc
    seriousViolation: {
      type: Boolean,
      default: false,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Mỗi học sinh trong một lớp + một tuần chỉ có 1 bản ghi
meritScoreSchema.index(
  {
    name: 1,
    className: 1,
    weekNumber: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model('MeritScore', meritScoreSchema);
