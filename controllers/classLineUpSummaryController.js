import ClassLineUpSummary from "../models/ClassLineUpSummary.js";

// ✅ Ghi nhận lỗi
export const createRecord = async (req, res) => {
  try {
    const record = new ClassLineUpSummary(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    console.error("Lỗi ghi nhận:", err);
    res.status(500).json({ message: "Không thể ghi nhận vi phạm" });
  }
};

// ✅ Lấy danh sách vi phạm trong tuần hiện tại
export const getWeeklySummary = async (req, res) => {
  try {
    const today = new Date();
    const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1)); // Thứ 2
    const lastDayOfWeek = new Date(today.setDate(firstDayOfWeek.getDate() + 6)); // CN

    const records = await ClassLineUpSummary.find({
      date: { $gte: firstDayOfWeek, $lte: lastDayOfWeek },
    }).sort({ date: -1 });

    res.json(records);
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu tuần:", err);
    res.status(500).json({ message: "Không thể tải danh sách vi phạm tuần" });
  }
};

// ✅ Xóa vi phạm (trừ điểm)
export const deleteRecord = async (req, res) => {
  try {
    const record = await ClassLineUpSummary.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: "Không tìm thấy vi phạm" });
    res.json({ message: "Đã xóa vi phạm", deleted: record });
  } catch (err) {
    console.error("Lỗi khi xóa:", err);
    res.status(500).json({ message: "Không thể xóa vi phạm" });
  }
};
