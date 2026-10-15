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
    const allowedGroups = ['N1', 'N2', 'N3', 'N4', 'N5', 'S1'];

    const groupCode = String(req.body.groupCode || '')
      .trim()
      .toUpperCase();

    const title = String(req.body.title || '').trim();
    const point = Number(req.body.point);

    if (!allowedGroups.includes(groupCode)) {
      return res.status(400).json({
        message: 'Mã nhóm không hợp lệ',
      });
    }

    if (!title) {
      return res.status(400).json({
        message: 'Vui lòng nhập nội dung vi phạm',
      });
    }

    if (
      req.body.point === '' ||
      req.body.point === null ||
      req.body.point === undefined ||
      !Number.isFinite(point)
    ) {
      return res.status(400).json({
        message: 'Điểm trừ phải là một số hợp lệ',
      });
    }

    // Lấy tên nhóm chuẩn từ nội quy hiện có trong MongoDB.
    const existingGroup = await Rule.findOne({ groupCode })
      .select('groupName')
      .lean();

    if (!existingGroup) {
      return res.status(400).json({
        message:
          `Nhóm ${groupCode} chưa có nội quy để xác định tên nhóm. ` +
          'Cần khai báo tên chuẩn cho nhóm này trước khi thêm.',
      });
    }

    // Tìm tất cả mã đúng định dạng của nhóm đang chọn.
    const escapedGroupCode = groupCode.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const codePattern = new RegExp(
      `^${escapedGroupCode}-(\\d+)$`
    );

    const existingRules = await Rule.find({
      groupCode,
      ruleCode: {
        $regex: `^${escapedGroupCode}-\\d+$`,
      },
    })
      .select('ruleCode')
      .lean();

    let maxNumber = 0;

    for (const rule of existingRules) {
      const match = rule.ruleCode.match(codePattern);

      if (match) {
        maxNumber = Math.max(
          maxNumber,
          Number(match[1])
        );
      }
    }

    const nextNumber = maxNumber + 1;

    // Giữ định dạng số có ít nhất 2 chữ số.
    const ruleCode =
      `${groupCode}-${String(nextNumber).padStart(2, '0')}`;

    const newRule = new Rule({
      groupCode,
      groupName: existingGroup.groupName,
      ruleCode,
      title,
      point,
      content: 'điểm/hs',
      active: true,
    });

    await newRule.save();

    return res.status(201).json(newRule);
  } catch (err) {
    console.error('createRule error:', err);

    // Unique index vẫn bảo vệ dữ liệu khi có hai
    // yêu cầu đồng thời nhận cùng một mã.
    if (err.code === 11000) {
      return res.status(409).json({
        message:
          'Mã nội quy vừa được tạo bởi một yêu cầu khác. ' +
          'Vui lòng thử thêm lại.',
      });
    }

    return res.status(500).json({
      message: 'Không thể tạo nội quy',
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
