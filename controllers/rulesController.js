const Rule = require('../models/Rule');
const xlsx = require('xlsx');

/**
 * ==========================================
 * LẤY TOÀN BỘ RULE
 * ==========================================
 */
exports.getAllRules = async (req, res) => {
  try {
    const rules = await Rule.find()
      .sort({
        groupCode: 1,
        ruleCode: 1,
      });

    res.json(rules);
  } catch (err) {
    console.error('getAllRules error:', err);

    res.status(500).json({
      message: 'Server error',
    });
  }
};


/**
 * ==========================================
 * TẠO RULE MỚI
 * ==========================================
 */
exports.createRule = async (req, res) => {
  try {
    const {
      groupCode,
      groupName,
      ruleCode,
      title,
      point,
      content,
      active,
    } = req.body;

    // Kiểm tra dữ liệu bắt buộc
    if (!groupCode || !groupName || !ruleCode || !title) {
      return res.status(400).json({
        message:
          'Vui lòng nhập đầy đủ groupCode, groupName, ruleCode và title',
      });
    }

    const normalizedGroupCode = String(groupCode)
      .trim()
      .toUpperCase();

    const normalizedRuleCode = String(ruleCode)
      .trim()
      .toUpperCase();

    // Kiểm tra mã lỗi trùng
    const existed = await Rule.findOne({
      ruleCode: normalizedRuleCode,
    });

    if (existed) {
      return res.status(400).json({
        message: `Mã lỗi ${normalizedRuleCode} đã tồn tại`,
      });
    }

    const newRule = new Rule({
      groupCode: normalizedGroupCode,
      groupName: String(groupName).trim(),
      ruleCode: normalizedRuleCode,
      title: String(title).trim(),
      point: Number(point) || 0,
      content: content ? String(content).trim() : '',
      active: active !== false,
    });

    await newRule.save();

    res.status(201).json(newRule);
  } catch (err) {
    console.error('createRule error:', err);

    res.status(500).json({
      message: 'Server error',
    });
  }
};


/**
 * ==========================================
 * CẬP NHẬT RULE
 * ==========================================
 */
exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      groupCode,
      groupName,
      ruleCode,
      title,
      point,
      content,
      active,
    } = req.body;

    // Kiểm tra dữ liệu bắt buộc
    if (!groupCode || !groupName || !ruleCode || !title) {
      return res.status(400).json({
        message:
          'Vui lòng nhập đầy đủ groupCode, groupName, ruleCode và title',
      });
    }

    const normalizedGroupCode = String(groupCode)
      .trim()
      .toUpperCase();

    const normalizedRuleCode = String(ruleCode)
      .trim()
      .toUpperCase();

    // Kiểm tra mã lỗi có bị trùng với Rule khác không
    const existed = await Rule.findOne({
      ruleCode: normalizedRuleCode,
      _id: { $ne: id },
    });

    if (existed) {
      return res.status(400).json({
        message: `Mã lỗi ${normalizedRuleCode} đã tồn tại`,
      });
    }

    const updated = await Rule.findByIdAndUpdate(
      id,
      {
        groupCode: normalizedGroupCode,
        groupName: String(groupName).trim(),
        ruleCode: normalizedRuleCode,
        title: String(title).trim(),
        point: Number(point) || 0,
        content: content ? String(content).trim() : '',
        active: active !== false,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        message: 'Không tìm thấy Rule',
      });
    }

    res.json(updated);
  } catch (err) {
    console.error('updateRule error:', err);

    res.status(500).json({
      message: 'Server error',
    });
  }
};


/**
 * ==========================================
 * XÓA RULE
 * ==========================================
 */
exports.deleteRule = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Rule.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        message: 'Không tìm thấy Rule',
      });
    }

    res.json({
      message: 'Deleted',
    });
  } catch (err) {
    console.error('deleteRule error:', err);

    res.status(500).json({
      message: 'Server error',
    });
  }
};


/**
 * ==========================================
 * IMPORT RULE TỪ EXCEL
 *
 * Excel gồm:
 *
 * groupCode
 * groupName
 * ruleCode
 * title
 * point
 * content
 * active
 *
 * ==========================================
 */
exports.importRules = async (req, res) => {
  try {
    // ----------------------------------------
    // Kiểm tra file
    // ----------------------------------------
    if (!req.file) {
      return res.status(400).json({
        message: 'Chưa chọn file Excel',
      });
    }

    // ----------------------------------------
    // Đọc Excel
    // ----------------------------------------
    const workbook = xlsx.readFile(req.file.path);

    const sheetName = workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    const data = xlsx.utils.sheet_to_json(sheet, {
      defval: '',
    });

    console.log('DATA IMPORT:', data);

    if (!data.length) {
      return res.status(400).json({
        message: 'File Excel không có dữ liệu',
      });
    }

    // ----------------------------------------
    // Chuẩn bị dữ liệu
    // ----------------------------------------
    const rules = [];

    const errors = [];

    // Kiểm tra trùng mã lỗi trong Excel
    const ruleCodes = new Set();

    data.forEach((rowData, index) => {
      const rowNumber = index + 2;

      const groupCode = String(
        rowData.groupCode || ''
      )
        .trim()
        .toUpperCase();

      const groupName = String(
        rowData.groupName || ''
      ).trim();

      const ruleCode = String(
        rowData.ruleCode || ''
      )
        .trim()
        .toUpperCase();

      const title = String(
        rowData.title || ''
      ).trim();

      const content = String(
        rowData.content || ''
      ).trim();

      const pointRaw = rowData.point;

      // --------------------------------------
      // Kiểm tra bắt buộc
      // --------------------------------------

      if (!groupCode) {
        errors.push(
          `Dòng ${rowNumber}: thiếu groupCode`
        );
        return;
      }

      if (!groupName) {
        errors.push(
          `Dòng ${rowNumber}: thiếu groupName`
        );
        return;
      }

      if (!ruleCode) {
        errors.push(
          `Dòng ${rowNumber}: thiếu ruleCode`
        );
        return;
      }

      if (!title) {
        errors.push(
          `Dòng ${rowNumber}: thiếu title`
        );
        return;
      }

      // --------------------------------------
      // Kiểm tra point
      // --------------------------------------

      const point = Number(pointRaw);

      if (
        pointRaw === '' ||
        pointRaw === null ||
        pointRaw === undefined ||
        Number.isNaN(point)
      ) {
        errors.push(
          `Dòng ${rowNumber}: point không hợp lệ`
        );
        return;
      }

      // --------------------------------------
      // Kiểm tra mã lỗi trùng trong Excel
      // --------------------------------------

      if (ruleCodes.has(ruleCode)) {
        errors.push(
          `Dòng ${rowNumber}: mã lỗi ${ruleCode} bị trùng trong Excel`
        );
        return;
      }

      ruleCodes.add(ruleCode);

      // --------------------------------------
      // Xử lý active
      // --------------------------------------

      let active = rowData.active;

      if (
        active === '' ||
        active === undefined ||
        active === null
      ) {
        active = true;
      } else {
        const activeText = String(active)
          .trim()
          .toLowerCase();

        active =
          active === true ||
          active === 1 ||
          activeText === 'true' ||
          activeText === 'yes' ||
          activeText === '1';
      }

      // --------------------------------------
      // Thêm Rule
      // --------------------------------------

      rules.push({
        groupCode,
        groupName,
        ruleCode,
        title,
        point,
        content,
        active,
      });
    });

    // ----------------------------------------
    // Nếu Excel có lỗi
    // KHÔNG xóa database
    // ----------------------------------------
    if (errors.length > 0) {
      return res.status(400).json({
        message:
          'File Excel có dữ liệu không hợp lệ',
        errors,
      });
    }

    if (!rules.length) {
      return res.status(400).json({
        message:
          'Không có dữ liệu hợp lệ để import',
      });
    }

    // ----------------------------------------
    // XÓA RULE CŨ
    //
    // Vì bạn xác định xây dựng lại
    // toàn bộ nội quy mới
    // ----------------------------------------
    await Rule.deleteMany({});

    // ----------------------------------------
    // IMPORT RULE MỚI
    // ----------------------------------------
    const insertedRules =
      await Rule.insertMany(rules);

    res.json({
      message:
        'Import nội quy thành công',
      count: insertedRules.length,
    });
  } catch (err) {
    console.error('importRules error:', err);

    res.status(500).json({
      message: 'Import failed',
      error: err.message,
    });
  }
};
