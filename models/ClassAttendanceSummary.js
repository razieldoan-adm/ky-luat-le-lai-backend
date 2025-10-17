const mongoose = require("mongoose");

const classAttendanceSummarySchema = new mongoose.Schema(
  {
    // 🔹 Tên lớp (bắt buộc)
    className: {
      type: String,
      required: true,
      trim: true,
    },

    // 🔹 Khối (lớp 10, 11, 12...)
    grade: {
      type: Number,
      required: true,
    },

    // 🔹 Số tuần học (VD: 1–35)
    weekNumber: {
      type: Number,
      required: true,
    },

    // 🔹 Tên học sinh (hoặc ID học sinh nếu cần)
    studentName: {
      type: String,
      required: true,
      trim: true,
    },

    // 🔹 Ngày điểm danh
    date: {
      type: Date,
      required: true,
    },

    // 🔹 Có mặt hay vắng
    present: {
      type: Boolean,
      default: true,
    },

    // 🔹 Có phép (true = nghỉ có phép, false = không phép)
    excuse: {
      type: Boolean,
      default: false,
    },

    // 🔹 Người ghi nhận (GV hoặc admin)
    recordedBy: {
      type: String,
      trim: true,
    },

    // 🔹 Ghi chú thêm
    note: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "ClassAttendanceSummary",
  classAttendanceSummarySchema
);
