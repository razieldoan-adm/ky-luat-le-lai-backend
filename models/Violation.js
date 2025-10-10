const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  name: { type: String, required: true },         // Tên học sinh hoặc mô tả lỗi
  className: { type: String, required: true },    // Tên lớp
  description: { type: String, default: '' },     // Mô tả chi tiết lỗi
  penalty: { type: Number, default: 0 },          // Điểm trừ (hoặc cộng)
  
  handlingMethod: {                               // Hình thức xử lý (nhắc nhở, kiểm điểm, ...)
    type: String,
    default: '',
  },

  handled: {                                      // Đã xử lý hay chưa
    type: Boolean,
    default: false,
  },

  handledBy: {                                    // Ai xử lý: GVCN / PGT / null
    type: String,
    enum: ['GVCN', 'PGT', ''],                   // Rõ ràng giới hạn giá trị
    default: '',
  },

  handlingNote: {                                 // (Tuỳ chọn) Ghi chú xử lý thêm nếu cần
    type: String,
    default: '',
  },

  weekNumber: { type: Number, required: true },   // Tuần học
  time: { type: Date, default: Date.now },        // Ngày vi phạm
});

module.exports = mongoose.model('Violation', violationSchema);
