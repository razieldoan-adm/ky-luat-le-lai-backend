const Rule = require('../models/Rule');
const RuleGroup = require('../models/RuleGroup');
const xlsx = require('xlsx');

const LEGACY_GROUPS = [
  { groupCode: 'N1', groupName: 'Nhóm N1', systemManaged: true },
  { groupCode: 'N2', groupName: 'Nhóm N2', systemManaged: true },
  { groupCode: 'N3', groupName: 'Nhóm N3', systemManaged: true },
  { groupCode: 'N4', groupName: 'Nhóm N4', systemManaged: true },
  { groupCode: 'N5', groupName: 'Nhóm N5', systemManaged: true },
  { groupCode: 'S1', groupName: 'Nhóm S1', systemManaged: true },
];

// Đếm mã lớn nhất đang có. Chỉ dùng để đồng bộ bộ đếm lần đầu;
// sau đó nextRuleNumber chỉ tăng, không giảm khi xóa nội quy.
function getRuleNumber(ruleCode, groupCode) {
  const escaped = groupCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(ruleCode || '').match(
    new RegExp(`^${escaped}-(\\d+)$`, 'i')
  );
  return match ? Number(match[1]) : 0;
}

async function ensureRuleGroups() {
  const existingRules = await Rule.find({})
    .select('groupCode groupName ruleCode')
    .lean();

  const groupsByCode = new Map();

  for (const legacy of LEGACY_GROUPS) {
    groupsByCode.set(legacy.groupCode, {
      ...legacy,
      maxRuleNumber: 0,
    });
  }

  for (const rule of existingRules) {
    const code = String(rule.groupCode || '').trim().toUpperCase();
    if (!code) continue;

    if (!groupsByCode.has(code)) {
      groupsByCode.set(code, {
        groupCode: code,
        groupName: String(rule.groupName || code).trim() || code,
        systemManaged: false,
        maxRuleNumber: 0,
      });
    }

      const item = groupsByCode.get(code);
    item.maxRuleNumber = Math.max(
      item.maxRuleNumber,
      getRuleNumber(rule.ruleCode, code)
    );

    // Với nhóm cũ N1-N5/S1, lấy tên thật từ nội quy đang lưu.
    // Không tự ghi đè tên các nhóm N6/S3... đã do quản trị viên đặt.
    const isLegacyGroup = LEGACY_GROUPS.some(
      (legacy) => legacy.groupCode === code
    );
    if (rule.groupName && (isLegacyGroup || item.groupName === code)) {
      item.groupName = String(rule.groupName).trim();
    }
  }

for (const item of groupsByCode.values()) {
    const nextRuleNumber = item.maxRuleNumber + 1;
    const isLegacyGroup = LEGACY_GROUPS.some(
      (legacy) => legacy.groupCode === item.groupCode
    );

    await RuleGroup.updateOne(
      { groupCode: item.groupCode },
      {
        $setOnInsert: {
          groupCode: item.groupCode,
          groupName: item.groupName,
          systemManaged: item.systemManaged,
        },
        $max: { nextRuleNumber },
      },
      { upsert: true }
    );

    // Cập nhật tên chuẩn cho nhóm cũ từ Rule nếu có tên thật.
    // Không thay tên nhóm do người quản trị tự đặt ở N6/S3 trở đi.
    if (isLegacyGroup && item.groupName) {
      await RuleGroup.updateOne(
        { groupCode: item.groupCode },
        { $set: { groupName: item.groupName } }
      );
    }
  }
}

exports.getAllRules = async (req, res) => {
  try {
    const rules = await Rule.find().sort({ groupCode: 1, ruleCode: 1 });
    res.json(rules);
  } catch (err) {
    console.error('getAllRules error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Lấy danh sách nhóm để giao diện quản trị có thể hiển thị nhóm chưa có nội quy.
exports.getRuleGroups = async (req, res) => {
  try {
    await ensureRuleGroups();
    const groups = await RuleGroup.find().sort({ groupCode: 1 }).lean();
    res.json(groups);
  } catch (err) {
    console.error('getRuleGroups error:', err);
    res.status(500).json({ message: 'Không thể lấy danh sách nhóm nội quy' });
  }
};

// Tạo nhóm mới. Nhóm tự tạo dùng mã N6, N7...; không cho tạo mã S tùy ý.
exports.createRuleGroup = async (req, res) => {
  try {
    await ensureRuleGroups();

    const groupName = String(req.body.groupName || '').trim();
    const groupPrefix = String(req.body.groupPrefix || 'N')
      .trim()
      .toUpperCase();

    if (!groupName) {
      return res.status(400).json({
        message: 'Vui lòng nhập tên nhóm nội quy',
      });
    }

    if (!['N', 'S'].includes(groupPrefix)) {
      return res.status(400).json({
        message: 'Loại mã nhóm chỉ được là N hoặc S',
      });
    }

    const existingGroups = await RuleGroup.find({
      groupCode: { $regex: `^${groupPrefix}\\d+$`, $options: 'i' },
    })
      .select('groupCode')
      .lean();

    // N1-N5 và S1-S2 được dành riêng; không cấp lại các mã này.
    let maxNumber = groupPrefix === 'N' ? 5 : 2;

    for (const group of existingGroups) {
      const match = String(group.groupCode).match(
        new RegExp(`^${groupPrefix}(\\d+)$`, 'i')
      );
      if (match) {
        maxNumber = Math.max(maxNumber, Number(match[1]));
      }
    }

    const groupCode = `${groupPrefix}${maxNumber + 1}`;

    const group = await RuleGroup.create({
      groupCode,
      groupName,
      systemManaged: false,
      nextRuleNumber: 1,
    });

    return res.status(201).json(group);
  } catch (err) {
    console.error('createRuleGroup error:', err);

    if (err.code === 11000) {
      return res.status(409).json({
        message:
          'Mã nhóm vừa được tạo bởi một yêu cầu khác. Vui lòng tải lại danh sách rồi thử lại.',
      });
    }

    return res.status(500).json({
      message: 'Không thể tạo nhóm nội quy',
    });
  }
};

exports.createRule = async (req, res) => {
  try {
    await ensureRuleGroups();

    const groupCode = String(req.body.groupCode || '').trim().toUpperCase();
    const title = String(req.body.title || '').trim();
    const point = Number(req.body.point);

    if (!groupCode) {
      return res.status(400).json({ message: 'Vui lòng chọn nhóm nội quy' });
    }
    if (groupCode === 'S2') {
      return res.status(403).json({
        message: 'Nhóm S2 là nhóm hệ thống, không được tạo nội quy theo cách thông thường',
      });
    }
    if (!title) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung vi phạm' });
    }
    if (
      req.body.point === '' ||
      req.body.point === null ||
      req.body.point === undefined ||
      !Number.isFinite(point)
    ) {
      return res.status(400).json({ message: 'Điểm trừ phải là một số hợp lệ' });
    }

    const group = await RuleGroup.findOne({ groupCode });
    if (!group) {
      return res.status(400).json({ message: `Nhóm ${groupCode} không tồn tại` });
    }

    // Cấp số bằng thao tác nguyên tử. Nếu tạo Rule thất bại, số đã cấp vẫn bỏ qua,
    // bảo đảm mã đã cấp không bị dùng lại.
    const allocatedGroup = await RuleGroup.findOneAndUpdate(
      { _id: group._id },
      { $inc: { nextRuleNumber: 1 } },
      { new: false }
    );

    if (!allocatedGroup) {
      return res.status(400).json({ message: 'Không thể cấp mã nội quy cho nhóm này' });
    }

    const ruleCode =
      `${groupCode}-${String(allocatedGroup.nextRuleNumber).padStart(2, '0')}`;

    const newRule = new Rule({
      groupCode,
      groupName: group.groupName,
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
    if (err.code === 11000) {
      return res.status(409).json({
        message: 'Mã nội quy bị trùng. Vui lòng thử tạo lại.',
      });
    }
    return res.status(500).json({ message: 'Không thể tạo nội quy' });
  }
};

exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const title = String(req.body.title || '').trim();
    const point = Number(req.body.point);

    if (!title) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung vi phạm' });
    }
    if (
      req.body.point === '' ||
      req.body.point === null ||
      req.body.point === undefined ||
      !Number.isFinite(point)
    ) {
      return res.status(400).json({ message: 'Điểm trừ phải là một số hợp lệ' });
    }

    // Chỉ cho sửa nội dung/điểm/trạng thái; không cho đổi mã nhóm hay mã nội quy.
    const update = {
      title,
      point,
      content: req.body.content ? String(req.body.content).trim() : '',
      active: req.body.active !== false,
    };

    const updated = await Rule.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy nội quy' });
    }
    res.json(updated);
  } catch (err) {
    console.error('updateRule error:', err);
    res.status(500).json({ message: 'Không thể cập nhật nội quy' });
  }
};

exports.deleteRule = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Rule.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy nội quy' });
    }
    // Không giảm RuleGroup.nextRuleNumber khi xóa, nên mã cũ không được cấp lại.
    res.json({ message: 'Đã xóa nội quy' });
  } catch (err) {
    console.error('deleteRule error:', err);
    res.status(500).json({ message: 'Không thể xóa nội quy' });
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

    await ensureRuleGroups();

    res.json({
      message: 'Import nội quy thành công',
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
