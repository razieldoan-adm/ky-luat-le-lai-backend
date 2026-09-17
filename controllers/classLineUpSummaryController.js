const ClassLineUpSummary = require('../models/ClassLineUpSummary');
const Setting = require('../models/Setting');
const AcademicWeek = require("../models/AcademicWeek");
const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const sharp = require("sharp");
const { Readable } = require("stream");
const { getDrive } = require("../utils/googleDrive");

// Helper: lấy điểm mặc định (thử nhiều tên trường trong Setting, fallback = 10)
function getDefaultPenalty(setting) {
  if (!setting) return 10;
  return setting.defaultLineUpPenalty
    ?? setting.defaultViolationScore
    ?? setting.lineUpScore
    ?? 10;
}

// 🔹 Ghi nhận lỗi xếp hàng
exports.createRecord = async (req, res) => {
  try {
    const { className, studentName, violation, recorder, date, note } = req.body;

    // 1️⃣ Tìm tuần tương ứng theo ngày
    const targetWeek = await AcademicWeek.findOne({
      startDate: { $lte: date },
      endDate: { $gte: date },
    });
    const weekNumber = targetWeek ? targetWeek.weekNumber : null;

    // 2️⃣ Lấy điểm mặc định từ Setting (hoặc 10 nếu chưa có)
    const setting = await Setting.findOne();
    const defaultScore = setting?.lineUpScore || 10;

    // 3️⃣ Tạo record (điểm luôn dương)
    const record = new ClassLineUpSummary({
      className,
      studentName,
      violation,
      recorder,
      date,
      weekNumber,
      scoreChange: Math.abs(defaultScore),
      note: note || "", // ⚡ bây giờ note đã được khai báo
    });

    await record.save();
    res.status(201).json(record);
  } catch (err) {
    console.error("Lỗi ghi nhận:", err);
    res.status(500).json({ message: "Không thể ghi nhận vi phạm", error: err.message });
  }
};


// 🔹 Lấy danh sách vi phạm trong tuần
exports.getWeeklySummary = async (req, res) => {
  try {
    const { weekNumber, className } = req.query;

    if (!weekNumber) {
      return res.status(400).json({ message: "Thiếu tham số weekNumber" });
    }

    const query = { weekNumber: Number(weekNumber) };
    if (className) query.className = className;

    const records = await ClassLineUpSummary.find(query);

    res.status(200).json({
      message: "Lấy danh sách lineup thành công",
      records,
    });
  } catch (err) {
    console.error("Lỗi getWeeklySummary:", err);
    res.status(500).json({
      message: "Lỗi server khi lấy dữ liệu lineup",
      error: err.message,
    });
  }
};


// 🔹 Lấy tất cả bản ghi
exports.getAllRecords = async (req, res) => {
  try {
    const records = await ClassLineUpSummary.find().sort({ date: -1 });
    return res.json(records);
  } catch (err) {
    console.error('getAllRecords error:', err);
    return res.status(500).json({ message: 'Lỗi khi lấy danh sách' });
  }
};

// 🔹 Xóa vi phạm
exports.deleteRecord = async (req, res) => {
  try {
    const id = req.params.id;
    const record = await ClassLineUpSummary.findByIdAndDelete(id);
    if (!record) return res.status(404).json({ message: 'Không tìm thấy vi phạm' });
    return res.json({ message: 'Đã xóa vi phạm', deleted: record });
  } catch (err) {
    console.error('deleteRecord error:', err);
    return res.status(500).json({ message: 'Không thể xóa vi phạm' });
  }
};

// 🔹 Tổng hợp điểm xếp hàng theo lớp trong tuần + lưu vào ClassWeeklyScore
exports.getClassLineUpTotal = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    if (!weekNumber) return res.status(400).json({ message: "Thiếu weekNumber" });

    const records = await ClassLineUpSummary.find({ weekNumber: Number(weekNumber) });

    // Gom nhóm theo lớp
    const grouped = {};
    records.forEach((r) => {
      if (!grouped[r.className]) grouped[r.className] = [];
      grouped[r.className].push(r.scoreChange);
    });

    // Tổng hợp và lưu
    const result = await Promise.all(Object.keys(grouped).map(async (className) => {
      const scores = grouped[className];
      const total = scores.reduce((a, b) => a + b, 0);

      // ✅ Luôn lưu tổng điểm dương
      await ClassWeeklyScore.findOneAndUpdate(
        { className, weekNumber: Number(weekNumber) },
        {
          $set: {
            lineUpScore: Math.abs(total),
            lastUpdated: new Date(),
          },
        },
        { upsert: true }
      );

      return { className, scores, total, count: scores.length };
    }));

    res.json(result);
  } catch (err) {
    console.error("Lỗi getClassLineUpTotal:", err);
    res.status(500).json({ message: "Không thể tính tổng điểm xếp hàng" });
  }
};

// 🔹 Cập nhật thủ công điểm xếp hàng


exports.updateWeeklyLineUpScore = async (req, res) => {
  try {
    const { className, weekNumber, lineUpScore } = req.body;

    if (!className || !weekNumber) {
      return res.status(400).json({ message: "Thiếu className hoặc weekNumber" });
    }

    // ✅ Cập nhật hoặc tạo mới, chỉ thay đổi field lineUpScore
    const updated = await ClassWeeklyScore.findOneAndUpdate(
      { className, weekNumber },
      {
        $set: {
          lineUpScore: lineUpScore || 0,
          lastUpdated: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return res.json({
      message: "✅ Đã cập nhật điểm lineup thành công",
      data: updated,
    });
  } catch (err) {
    console.error("❌ Lỗi updateWeeklyLineUpScore:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ============================================================
// 📷 UPLOAD HÌNH ẢNH CHO LỖI XẾP HÀNG
// ============================================================

exports.uploadImages = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await ClassLineUpSummary.findById(id);

    if (!record) {
      return res.status(404).json({
        message: "Không tìm thấy bản ghi vi phạm xếp hàng",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "Không có hình ảnh được tải lên",
      });
    }

    const drive = await getDrive();

    // Tìm thư mục Google Drive hiện tại của hệ thống
    const folderName = "KyLuatLeLai-AnhViPham";

    const folderResponse = await drive.files.list({
      q: [
        `name = '${folderName}'`,
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false",
      ].join(" and "),
      fields: "files(id,name)",
      spaces: "drive",
    });

    const folder = folderResponse.data.files?.[0];

    if (!folder) {
      return res.status(500).json({
        message: "Không tìm thấy thư mục Google Drive lưu hình ảnh",
      });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      try {
        // 🔹 Nén ảnh bằng Sharp
        const compressedBuffer = await sharp(file.buffer)
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({
            quality: 80,
            mozjpeg: true,
          })
          .toBuffer();

        // 🔹 Tên file
        const fileName = `${Date.now()}-${file.originalname
          .replace(/[^\w.\- ]/g, "_")}`;

        // 🔹 Upload lên Google Drive
        const uploaded = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [folder.id],
          },
          media: {
            mimeType: "image/jpeg",
            body: Readable.from(compressedBuffer),
          },
          fields: "id,name",
        });

        const fileId = uploaded.data.id;

        if (!fileId) {
          continue;
        }

        // 🔹 Lưu URL nội bộ
        uploadedImages.push({
          fileId,
          url: `/api/class-lineup-summaries/${id}/images/${fileId}`,
        });
      } catch (imageErr) {
        console.error(
          "❌ Lỗi xử lý/upload một hình ảnh:",
          imageErr
        );
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(500).json({
        message: "Không thể upload hình ảnh",
      });
    }

    // 🔹 Thêm ảnh vào record hiện tại
    record.images = [
      ...(record.images || []),
      ...uploadedImages,
    ];

    await record.save();

    return res.json({
      message: "✅ Upload hình ảnh thành công",
      images: record.images,
      record,
    });
  } catch (err) {
    console.error("❌ uploadImages error:", err);

    return res.status(500).json({
      message: "Không thể upload hình ảnh",
      error: err.message,
    });
  }
};


// ============================================================
// 📷 XÓA HÌNH ẢNH
// ============================================================

exports.deleteImage = async (req, res) => {
  try {
    const { id, fileId } = req.params;

    const record = await ClassLineUpSummary.findById(id);

    if (!record) {
      return res.status(404).json({
        message: "Không tìm thấy bản ghi",
      });
    }

    const imageExists = (record.images || []).some(
      (image) => image.fileId === fileId
    );

    if (!imageExists) {
      return res.status(404).json({
        message: "Không tìm thấy hình ảnh",
      });
    }

    // Xóa file trên Google Drive
    const drive = await getDrive();

    try {
      await drive.files.delete({
        fileId,
      });
    } catch (driveErr) {
      console.warn(
        "⚠️ Không xóa được file Google Drive:",
        driveErr.message
      );
    }

    // Xóa reference trong MongoDB
    record.images = (record.images || []).filter(
      (image) => image.fileId !== fileId
    );

    await record.save();

    return res.json({
      message: "✅ Đã xóa hình ảnh",
      images: record.images,
    });
  } catch (err) {
    console.error("❌ deleteImage error:", err);

    return res.status(500).json({
      message: "Không thể xóa hình ảnh",
      error: err.message,
    });
  }
};


// ============================================================
// 📷 XEM / STREAM HÌNH ẢNH
// ============================================================

exports.getImage = async (req, res) => {
  try {
    const { id, fileId } = req.params;

    const record = await ClassLineUpSummary.findById(id);

    if (!record) {
      return res.status(404).json({
        message: "Không tìm thấy bản ghi",
      });
    }

    const imageExists = (record.images || []).some(
      (image) => image.fileId === fileId
    );

    if (!imageExists) {
      return res.status(404).json({
        message: "Hình ảnh không thuộc bản ghi này",
      });
    }

    const drive = await getDrive();

    const response = await drive.files.get(
      {
        fileId,
        alt: "media",
      },
      {
        responseType: "stream",
      }
    );

    res.setHeader(
      "Content-Type",
      response.headers["content-type"] || "image/jpeg"
    );

    response.data.on("error", (err) => {
      console.error("❌ Google Drive stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          message: "Không thể đọc hình ảnh",
        });
      }
    });

    response.data.pipe(res);
  } catch (err) {
    console.error("❌ getImage error:", err);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Không thể lấy hình ảnh",
        error: err.message,
      });
    }
  }
};

