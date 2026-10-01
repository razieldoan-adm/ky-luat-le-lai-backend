const ClassAttendanceSummarySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },

  studentName: {
    type: String,
    required: true,
  },

  className: {
    type: String,
    required: true,
  },

  grade: {
    type: String,
    required: true,
  },

  date: {
    type: String,
    required: true,
  },

  weekNumber: {
    type: Number,
    required: true,
  },

  session: {
    type: String,
    enum: ["sáng", "chiều"],
    required: true,
  },

  // false = nghỉ không phép
  // true  = nghỉ có phép
  permission: {
    type: Boolean,
    default: false,
  },

  // Đánh dấu trường hợp ngoại lệ
  isException: {
    type: Boolean,
    default: false,
  },

  // Ghi chú lý do ngoại lệ
  exceptionNote: {
    type: String,
    default: "",
    trim: true,
  },

  // Đã được đưa vào xử lý hạnh kiểm hay chưa
  conductReviewed: {
    type: Boolean,
    default: false,
  },
  
});

ClassAttendanceSummarySchema.index(
  { studentId: 1, date: 1, session: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "ClassAttendanceSummary",
  ClassAttendanceSummarySchema
);
