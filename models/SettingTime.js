const mongoose = require('mongoose');

const settingTimeSchema = new mongoose.Schema({
  startSchoolYear: { type: Date, required: true },
  endSchoolYear: { type: Date, required: true }
});

module.exports = mongoose.model('SettingTime', settingTimeSchema);
