
const ClassHygieneScore = require("../models/ClassHygieneScore");

// Lưu
const saveClassHygieneScores = async (req, res) => {
  try {
    const { weekNumber, scores } = req.body;

    if (!weekNumber || !scores) {
      return res.status(400).json({ message: "Thiếu dữ liệu weekNumber hoặc scores" });
    }

    for (const s of scores) {
      await ClassHygieneScore.findOneAndUpdate(
        { classId: s.classId, date: s.date, weekNumber },
        {
          sessions: {
            morning: {
              absentDuty: s.morning?.absentDuty || 0,
              noLightFan: s.morning?.noLightFan || 0,
              notClosedDoor: s.morning?.notClosedDoor || 0,
            },
            afternoon: {
              absentDuty: s.afternoon?.absentDuty || 0,
              noLightFan: s.afternoon?.noLightFan || 0,
              notClosedDoor: s.afternoon?.notClosedDoor || 0,
            },
          },
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: "Đã lưu điểm vệ sinh thành công." });
  } catch (err) {
    console.error("❌ Lỗi khi lưu hygiene scores:", err);
    res.status(500).json({ error: "Lỗi server", detail: err.message });
  }
};

// Lấy theo tuần
const getByWeek = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    if (!weekNumber) return res.status(400).json({ message: "Thiếu weekNumber" });

    const scores = await ClassHygieneScore.find({ weekNumber: Number(weekNumber) })
      .populate("classId", "name");
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: err.message });
  }
};

// Lấy theo tuần + lớp
const getByWeekAndClass = async (req, res) => {
  try {
    const { weekNumber, classId } = req.query;
    if (!weekNumber || !classId) {
      return res.status(400).json({ message: "Thiếu weekNumber hoặc classId" });
    }

    const score = await ClassHygieneScore.findOne({
      weekNumber: Number(weekNumber),
      classId,
    }).populate("classId", "name");

    res.json(score);
  } catch (err) {
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

// Xuất tất cả lớp trong tuần (có tổng điểm)
const getSummaryByWeek = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    if (!weekNumber) return res.status(400).json({ message: "Thiếu weekNumber" });

    const scores = await ClassHygieneScore.find({ weekNumber: Number(weekNumber) })
      .populate("classId", "name");

    const summary = scores.map((s) => {
      const morning = s.sessions?.morning || {};
      const afternoon = s.sessions?.afternoon || {};

      const absentDuty = (morning.absentDuty || 0) + (afternoon.absentDuty || 0);
      const noLightFan = (morning.noLightFan || 0) + (afternoon.noLightFan || 0);
      const notClosedDoor = (morning.notClosedDoor || 0) + (afternoon.notClosedDoor || 0);

      return {
        classId: s.classId._id,
        className: s.classId.name,
        weekNumber: s.weekNumber,
        absentDuty,
        noLightFan,
        notClosedDoor,
        total: (absentDuty + noLightFan + notClosedDoor) * 10,
        date: s.date,
      };
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

module.exports = {
  saveClassHygieneScores,
  getByWeek,
  getByWeekAndClass,
  getSummaryByWeek,
};
