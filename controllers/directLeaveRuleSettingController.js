const DirectLeaveRuleSetting = require('../models/DirectLeaveRuleSetting');


// ============================================================
// LẤY DANH SÁCH QUY ĐỊNH ĐƯỢC PHÉP XIN TRỰC TIẾP
// GET /api/direct-leave-rules
// ============================================================
exports.getSetting = async (req, res) => {
  try {
    let setting = await DirectLeaveRuleSetting.findOne();

    // Nếu chưa có cấu hình thì tạo mặc định
    if (!setting) {
      setting = await DirectLeaveRuleSetting.create({
        ruleCodes: [],
      });
    }

    return res.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    console.error('❌ Lỗi getSetting:', error);

    return res.status(500).json({
      success: false,
      message: 'Không thể lấy cấu hình đơn xin phép',
      error: error.message,
    });
  }
};


// ============================================================
// LƯU CẤU HÌNH
// PUT /api/direct-leave-rules
// ============================================================
exports.updateSetting = async (req, res) => {
  try {
    const { ruleCodes } = req.body;

    if (!Array.isArray(ruleCodes)) {
      return res.status(400).json({
        success: false,
        message: 'ruleCodes phải là một mảng',
      });
    }

    const normalizedCodes = [
      ...new Set(
        ruleCodes
          .filter((code) => typeof code === 'string')
          .map((code) => code.trim().toUpperCase())
          .filter(Boolean)
      ),
    ];

    let setting = await DirectLeaveRuleSetting.findOne();

    if (!setting) {
      setting = new DirectLeaveRuleSetting({
        ruleCodes: normalizedCodes,
      });
    } else {
      setting.ruleCodes = normalizedCodes;
    }

    await setting.save();

    return res.json({
      success: true,
      message: 'Đã lưu quy định được phép xin trực tiếp',
      data: setting,
    });
  } catch (error) {
    console.error('❌ Lỗi updateSetting:', error);

    return res.status(500).json({
      success: false,
      message: 'Không thể lưu cấu hình',
      error: error.message,
    });
  }
};
