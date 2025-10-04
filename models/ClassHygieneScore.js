import mongoose, { Schema, Document } from "mongoose";

export interface IClassHygieneScore extends Document {
  classId: mongoose.Types.ObjectId;
  date: Date;
  weekNumber: number;
  absentDuty: number;
  noLightFan: number;
  notClosedDoor: number;
}

const ClassHygieneScoreSchema = new Schema<IClassHygieneScore>({
  classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
  date: { type: Date, required: true },
  weekNumber: { type: Number, required: true },
  absentDuty: { type: Number, default: 0 },
  noLightFan: { type: Number, default: 0 },
  notClosedDoor: { type: Number, default: 0 },
});

// Chuẩn hóa ngày: bỏ giây & ms
ClassHygieneScoreSchema.pre("save", function (next) {
  if (this.date instanceof Date) {
    this.date.setSeconds(0, 0);
  }
  next();
});

// Đảm bảo 1 lớp - 1 ngày - 1 tuần chỉ có 1 bản ghi
ClassHygieneScoreSchema.index({ classId: 1, date: 1, weekNumber: 1 }, { unique: true });

const ClassHygieneScore = mongoose.model<IClassHygieneScore>("ClassHygieneScore", ClassHygieneScoreSchema);
module.exports = ClassHygieneScore;

