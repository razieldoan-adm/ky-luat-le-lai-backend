const SettingTime = require('../models/SettingTime');

// Lấy setting thời gian
exports.getSettingTime = async (req, res) => {
  try {
    const setting = await SettingTime.findOne();
    res.json(setting);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Cập nhật setting thời gian
exports.updateSettingTime = async (req, res) => {
  try {
    const update = req.body;

    let setting = await SettingTime.findOne();

    if (!setting) {
      setting = new SettingTime(update);
    } else {
      if (update.startSchoolYear) setting.startSchoolYear = update.startSchoolYear;
      if (update.endSchoolYear) setting.endSchoolYear = update.endSchoolYear;
    }

    await setting.save();
    res.json(setting);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
