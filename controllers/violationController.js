const Violation = require('../models/Violation');
const Rule = require('../models/Rule');
const Setting = require('../models/Setting');
const MeritScore = require('../models/MeritScore');

// Helper chuẩn hóa tên (không phân biệt hoa/thường trong DB)
const normalizeName = (name) => name?.trim().toLowerCase();

// Cập nhật điểm hạnh kiểm vào collection riêng
const updateMeritScore = async (studentName, className) => {
  const name = normalizeName(studentName);
  const settings = await Setting.findOne();

  const allViolations = await Violation.find({ name, className })
    .collation({ locale: 'en', strength: 2 });

  const totalPenalty = allViolations.reduce((sum, v) => sum + (v.penalty || 0), 0);
  const maxMerit = settings?.maxMeritScore || 100;
  const meritScore = Math.max(maxMerit - totalPenalty, 0);

  await MeritScore.findOneAndUpdate(
    { name, className },
    { score: meritScore, timestamp: new Date() },
    { upsert: true }
  );
};

// 🔎 Tìm học sinh có tên gần giống (không phân biệt hoa/thường)
exports.searchViolations = async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'Missing name' });

  try {
    const regex = new RegExp(name, 'i');
    const matches = await Violation.find({ name: regex }).distinct('name');

    const results = [];
    for (const matchedName of matches) {
      const v = await Violation.findOne({ name: matchedName });
      results.push({ name: v.name, className: v.className });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// 📌 Lấy vi phạm theo học sinh
exports.getViolationsByStudent = async (req, res) => {
  const { className } = req.query;
  const name = normalizeName(req.params.name);

  try {
    const violations = await Violation.find({ name, className })
      .collation({ locale: 'en', strength: 2 });
    res.json(violations);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ➕ Ghi nhận vi phạm mới (lưu cả weekNumber)
exports.createViolation = async (req, res) => {
  try {
    const { className, description, handlingMethod, handledBy, handlingNote, weekNumber, time, name: rawName } = req.body;

    if (!rawName || !description || !className) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc (name, description, className)" });
    }

    const name = normalizeName ? normalizeName(rawName) : rawName;

    const rule = await Rule.findOne({ title: description });
    const penalty = rule && typeof rule.point === "number" ? rule.point : 0;

    const violation = new Violation({
      name,
      className,
      description,
      penalty,
      handlingMethod,
      handledBy,
      handlingNote,
      handled: !!handledBy,
      weekNumber,
      time: time ? new Date(time) : new Date(),
    });

    await violation.save();

    try {
      await updateMeritScore(name, className);
    } catch (err) {
      console.error("⚠️ Lỗi khi cập nhật điểm hạnh kiểm:", err.message);
    }

    res.status(201).json(violation);
  } catch (error) {
    console.error("❌ Lỗi khi ghi nhận vi phạm:", error.message);
    console.error(error.stack);
    res.status(500).json({ error: "Lỗi khi ghi nhận vi phạm (chi tiết xem server log)." });
  }
};



// 🛠️ Xử lý vi phạm (cập nhật handled + handlingMethod)
exports.handleViolation = async (req, res) => {
  const { id } = req.params;
  const { handledBy, role } = req.body; // ⚠️ Thêm role (GVCN, PGT, BGH...)

  try {
    const violation = await Violation.findById(id);
    if (!violation) {
      return res.status(404).json({ error: "Không tìm thấy vi phạm" });
    }

    // 🔹 Lấy tuần và học sinh để kiểm tra giới hạn
    const weekNumber = violation.weekNumber;
    const studentId = violation.studentId;

    // 🔹 Lấy cài đặt hệ thống
    const setting = await Setting.findOne();
    const limitGVCN = setting?.limitGVCNHandling ?? false;

    // 🔹 Nếu bật giới hạn và là GVCN thì kiểm tra
    if (limitGVCN && role === "GVCN") {
      const count = await Violation.countDocuments({ studentId, weekNumber });
      if (count >= 2) {
        return res.status(403).json({
          message:
            "Học sinh đã vi phạm ≥ 2 lần trong tuần này. GVCN không được phép xử lý thêm.",
        });
      }
    }

    // ✅ Luôn cho phép cập nhật người xử lý
    violation.handledBy = handledBy;
    violation.handled = true;

    // ⚙️ Xác định hình thức xử lý nếu chưa có
    if (!violation.handlingMethod) {
      const count = await Violation.countDocuments({ name: violation.name });

      let method = "";
      if (count === 1) method = "Nhắc nhở";
      else if (count === 2) method = "Kiểm điểm";
      else if (count === 3) method = "Chép phạt";
      else if (count === 4) method = "Báo phụ huynh";
      else if (count === 5) method = "Mời phụ huynh";
      else if (count === 6) method = "Tạm dừng việc học tập";
      else method = "Xét hạ hạnh kiểm";

      violation.handlingMethod = method;
    }

    await violation.save();
    res.json(violation);
  } catch (err) {
    console.error("Lỗi khi xử lý vi phạm:", err);
    res.status(500).json({ error: "Lỗi server khi xử lý vi phạm" });
  }
};



// ✅ Đánh dấu vi phạm đã xử lý
exports.markViolationHandled = async (req, res) => {
  const { id } = req.params;

  try {
    const violation = await Violation.findByIdAndUpdate(
      id,
      { handled: true },
      { new: true }
    );

    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }

    res.json({ message: 'Violation marked as handled', violation });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ❌ Xoá vi phạm
exports.deleteViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const violation = await Violation.findByIdAndDelete(id);

    if (!violation) {
      return res.status(404).json({ error: 'Không tìm thấy vi phạm để xoá.' });
    }

    await updateMeritScore(violation.name, violation.className);
    res.status(200).json({ message: 'Đã xoá vi phạm và cập nhật điểm.' });
  } catch (error) {
    console.error('❌ Lỗi khi xoá vi phạm:', error);
    res.status(500).json({ error: 'Không thể xoá vi phạm.' });
  }
};

// 🔔 Lấy danh sách học sinh có lỗi chưa xử lý (gộp theo name + className)
exports.getUnhandledViolationStudents = async (req, res) => {
  try {
    const unhandled = await Violation.aggregate([
      { $match: { handled: false } },
      {
        $group: {
          _id: { name: "$name", className: "$className" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: "$_id.name",
          className: "$_id.className",
          count: 1
        }
      }
    ]).collation({ locale: 'en', strength: 2 });

    res.json(unhandled);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// 📊 Lấy toàn bộ vi phạm
exports.getAllViolationStudents = async (req, res) => {
  try {
    const { weekNumber } = req.query;

    const filter = {};
    if (weekNumber) {
      filter.weekNumber = Number(weekNumber);
    }

    const violations = await Violation.find(filter)
      .sort({ time: -1 })
      .limit(500);   // tránh load toàn bộ DB

    res.json(violations);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách vi phạm' });
  }
};


// 📌 Tổng số vi phạm
exports.getViolationCount = async (req, res) => {
  try {
    const count = await Violation.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// 📌 Số vi phạm chưa xử lý
exports.getUnhandledViolationCount = async (req, res) => {
  try {
    const count = await Violation.countDocuments({ handled: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// 📌 Đếm học sinh vi phạm >= 3 lần
exports.countMultipleViolations = async (req, res) => {
  try {
    const result = await Violation.aggregate([
      {
        $group: {
          _id: { name: "$name", className: "$className" },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gte: 3 } } },
      { $count: "count" }
    ]).collation({ locale: 'en', strength: 2 });

    res.json({ count: result[0]?.count || 0 });
  } catch (err) {
    console.error('Lỗi khi đếm học sinh vi phạm nhiều lần:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
// ✏️ Sửa lỗi vi phạm (không thay đổi phần xử lý)
exports.updateViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      description,
      weekNumber,
      time,
      className,
      name: rawName,
    } = req.body;

    const name = rawName ? rawName.trim().toLowerCase() : undefined;

    // ✅ Tìm vi phạm
    const violation = await Violation.findById(id);
    if (!violation) {
      return res.status(404).json({ error: "Không tìm thấy vi phạm." });
    }

    // 🔧 Cập nhật các trường cho phép sửa
    if (description) {
      violation.description = description;

      // tự động cập nhật lại điểm phạt nếu mô tả đổi
      const rule = await Rule.findOne({ title: description });
      violation.penalty = rule && typeof rule.point === "number" ? rule.point : 0;
    }

    if (weekNumber !== undefined) violation.weekNumber = weekNumber;
    if (time) violation.time = new Date(time);
    if (className) violation.className = className;
    if (name) violation.name = name;

    await violation.save();

    // ⚙️ Cập nhật lại điểm hạnh kiểm
    await updateMeritScore(violation.name, violation.className);

    res.json({ message: "Đã cập nhật vi phạm thành công.", violation });
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật vi phạm:", error);
    res.status(500).json({ error: "Lỗi server khi cập nhật vi phạm." });
  }
};
exports.getGVCNHandlingLimit = async (req, res) => {
  try {
    const setting = await Setting.findOne();
    res.json({ limitGVCNHandling: setting?.limitGVCNHandling ?? false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi khi lấy cài đặt giới hạn" });
  }
};

// ✅ API bật/tắt giới hạn xử lý của GVCN
exports.toggleGVCNHandlingLimit = async (req, res) => {
  try {
    const { value } = req.body; // true/false
    let setting = await Setting.findOne();
    if (!setting) setting = new Setting();
    setting.limitGVCNHandling = value;
    await setting.save();
    res.json({ success: true, limitGVCNHandling: value });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi cập nhật giới hạn GVCN" });
  }
};
