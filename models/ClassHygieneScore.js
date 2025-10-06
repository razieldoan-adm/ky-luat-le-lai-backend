const mongoose = require("mongoose");
const { Schema } = mongoose;

const HygieneSessionSchema = new Schema({
  absentDuty: { type: Number, default: 0 },
  noLightFan: { type: Number, default: 0 },
  notClosedDoor: { type: Number, default: 0 },
});

const ClassHygieneScoreSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
  date: { type: Date, required: true },
  weekNumber: { type: Number, required: true },
  sessions: {
    morning: { type: HygieneSessionSchema, default: () => ({}) },
    afternoon: { type: HygieneSessionSchema, default: () => ({}) },
  },
});

// chuẩn hóa ngày
ClassHygieneScoreSchema.pre("save", function (next) {
  if (this.date instanceof Date) {
    this.date.setSeconds(0, 0);
  }
  next();
});

// mỗi lớp - ngày - tuần chỉ 1 bản ghi
ClassHygieneScoreSchema.index(
  { classId: 1, date: 1, weekNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("ClassHygieneScore", ClassHygieneScoreSchema);
