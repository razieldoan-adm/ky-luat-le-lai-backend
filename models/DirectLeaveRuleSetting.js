const mongoose = require('mongoose');

const directLeaveRuleSettingSchema = new mongoose.Schema(
  {
    ruleCodes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'DirectLeaveRuleSetting',
  directLeaveRuleSettingSchema
);
