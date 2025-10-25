const Setting = require('../models/Setting');

exports.getSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne();

    if (!setting) {
      // Nếu chưa có, tạo mới với default
      setting = await Setting.create({});
    }

    // Convert Map to plain object nếu cần
    const settingsData = setting.toObject();
    if (settingsData.maxClassAcademicScoresByGrade instanceof Map) {
      settingsData.maxClassAcademicScoresByGrade = Object.fromEntries(settingsData.maxClassAcademicScoresByGrade);
    }
      if (settingsData.limitGVCNHandling === undefined) {
      settingsData.limitGVCNHandling = false;
    }
    res.json(settingsData);
  } catch (err) {
    console.error('Lỗi khi lấy settings:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy settings.' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const update = req.body;

    // Convert object back to Map nếu cần
    if (update.maxClassAcademicScoresByGrade && !(update.maxClassAcademicScoresByGrade instanceof Map)) {
      update.maxClassAcademicScoresByGrade = new Map(Object.entries(update.maxClassAcademicScoresByGrade));
    }

    const setting = await Setting.findOneAndUpdate({}, update, { new: true, upsert: true });

    const settingsData = setting.toObject();
    if (settingsData.maxClassAcademicScoresByGrade instanceof Map) {
      settingsData.maxClassAcademicScoresByGrade = Object.fromEntries(settingsData.maxClassAcademicScoresByGrade);
    }

    res.json(settingsData);
  } catch (err) {
    console.error('Lỗi khi cập nhật settings:', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật settings.' });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { limitGVCNHandling, classViolationLimit } = req.body;

    let setting = await Setting.findOne();
    if (!setting) setting = new Setting({});

    // ✅ Cập nhật từng trường nếu có gửi lên
    if (limitGVCNHandling !== undefined) {
      setting.limitGVCNHandling = limitGVCNHandling;
    }

    if (classViolationLimit !== undefined) {
      setting.classViolationLimit = classViolationLimit;
    }

    await setting.save();

    res.json({
      message: "Cập nhật giới hạn xử lý kỷ luật thành công",
      setting,
    });
  } catch (err) {
    console.error("Lỗi khi cập nhật setting:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};





