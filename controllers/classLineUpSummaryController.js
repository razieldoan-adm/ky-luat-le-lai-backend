import ClassLineUpSummary from "../models/ClassLineUpSummary.js";
import Setting from "../models/Setting.js";

// ✅ Ghi nhận lỗi xếp hàng
export const createRecord = async (req, res) => {
  try {
    // Lấy điểm trừ mặc định từ settings
    const setting = await Setting.findOne();
    const defaultScore = setting?.lineUpScore || 10; // ví dụ key lưu trong Setting là "lineUpScore"

    const record = new ClassLineUpSummary({
      ...req.body,
      scoreChange: -Math.abs(defaultScore), // luôn trừ điểm
    });

    await record.save();
    res.status(201).json(record);
  } catch (err) {
    console.error("Lỗi ghi nhận:", err);
    res.status(500).json({ message: "Không thể ghi nhận vi phạm" });
  }
};

// ✅ Lấy danh sách lỗi (lọc theo tuần hoặc toàn bộ)
export const getRecords = async (req, res) => {
  try {
    const { filter } = req.query; // filter = 'week' hoặc 'all'
    let records = [];

    if (filter === "week") {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      records = await ClassLineUpSummary.find({
        date: { $gte: monday, $lte: sunday },
      }).sort({ date: -1 });
    } else {
      records = await ClassLineUpSummary.find().sort({ date: -1 });
    }

    res.json(records);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách:", err);
    res.status(500).json({ message: "Không thể tải dữ liệu" });
  }
};

// ✅ Xóa lỗi
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
