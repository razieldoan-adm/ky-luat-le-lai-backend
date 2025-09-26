// models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  normalizedName: String,
  className: { type: String, required: true },
  fatherPhone: { type: String, default: '' },
  motherPhone: { type: String, default: '' }
});
// middleware để luôn cập nhật normalizedName
studentSchema.pre("save", function (next) {
  if (this.name) {
    this.normalizedName = removeVietnameseTones(this.name).toLowerCase();
  }
  next();
})

module.exports = mongoose.model('Student', studentSchema);
