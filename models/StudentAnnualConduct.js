const mongoose = require("mongoose");

const studentAnnualConductSchema =
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

      // CÁC THÁNG ĐƯỢC TÍNH
      months: {
        type: [
          {
            month: Number,
            year: Number,
            classification: String,
          },
        ],
        default: [],
      },

      // XẾP LOẠI CẢ NĂM
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

      finalizedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

// Mỗi học sinh chỉ có 1 bản ghi / năm học
studentAnnualConductSchema.index(
  {
    name: 1,
    className: 1,
    academicYear: 1,
  },
  {
    unique: true,
  }
);

// Tìm theo lớp
studentAnnualConductSchema.index({
  className: 1,
  academicYear: 1,
});

module.exports =
  mongoose.model(
    "StudentAnnualConduct",
    studentAnnualConductSchema
  );
