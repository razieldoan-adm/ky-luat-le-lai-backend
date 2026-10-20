const mongoose = require('mongoose');

const ruleGroupSchema = new mongoose.Schema(
  {
    groupCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    groupName: {
      type: String,
      required: true,
      trim: true,
    },
    systemManaged: {
      type: Boolean,
      default: false,
    },
    // Số tiếp theo sẽ được cấp cho mã nội quy trong nhóm.
    // Không giảm giá trị này khi xóa nội quy.
    nextRuleNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.RuleGroup ||
  mongoose.model('RuleGroup', ruleGroupSchema);
