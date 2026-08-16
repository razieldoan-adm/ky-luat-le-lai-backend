const mongoose = require("mongoose");

const studentMonthlyConductSchema =
  new mongoose.Schema(
    {
      // HỌC SINH
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

      // NĂM HỌC
      academicYear: {
        type: String,
        required: true,
        trim: true,
      },

      // THÁNG
      month: {
        type: Number,
        required: true,
        min: 1,
        max: 12,
      },

      year: {
        type: Number,
        required: true,
      },

      // CÁC TUẦN ĐƯỢC DÙNG ĐỂ XẾP LOẠI
      weekNumbers: {
        type: [Number],
        default: [],
      },

      // SỐ TUẦN THEO TỪNG XẾP LOẠI
      classificationCounts: {
        tot: {
          type: Number,
          default: 0,
        },

        kha: {
          type: Number,
          default: 0,
        },

        dat: {
          type: Number,
          default: 0,
        },

        chuaDat: {
          type: Number,
          default: 0,
        },
      },

      // XẾP LOẠI THÁNG
      classification: {
        type: String,
        enum: [
          "",
          "Tốt",
          "Khá",
          "Đạt",
          "Chưa đạt",
        ],
        default: "",
      },

      // TRẠNG THÁI
      status: {
        type: String,
        enum: ["DRAFT", "FINAL"],
        default: "DRAFT",
      },

      // THỜI ĐIỂM CHỐT
      finalizedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

// Mỗi học sinh chỉ có 1 bản ghi / 1 tháng / 1 năm học
studentMonthlyConductSchema.index(
  {
    name: 1,
    className: 1,
    academicYear: 1,
    month: 1,
    year: 1,
  },
  {
    unique: true,
  }
);

// Tìm theo lớp + tháng
studentMonthlyConductSchema.index({
  className: 1,
  academicYear: 1,
  month: 1,
  year: 1,
});

// Tìm theo tháng
studentMonthlyConductSchema.index({
  academicYear: 1,
  month: 1,
  year: 1,
});

module.exports =
  mongoose.model(
    "StudentMonthlyConduct",
    studentMonthlyConductSchema
  );
