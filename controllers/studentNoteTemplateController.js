const StudentNoteTemplate = require('../models/StudentNoteTemplate');

// Lấy danh sách mẫu
exports.getTemplates = async (req, res) => {
  try {
    const filter = {};

    // Mặc định chỉ lấy mẫu đang sử dụng.
    // Quản lý mẫu truyền ?all=true để xem cả mẫu đã tắt.
    if (req.query.all !== 'true') {
      filter.active = true;
    }

    const templates = await StudentNoteTemplate.find(filter)
      .sort({ createdAt: -1 });

    res.json(templates);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Thêm mẫu
exports.createTemplate = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: 'Vui lòng nhập nội dung mẫu',
      });
    }

    const template = await StudentNoteTemplate.create({
      content: content.trim(),
    });

    res.status(201).json({
      message: 'Đã thêm ghi chú mẫu',
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Chỉnh sửa mẫu
exports.updateTemplate = async (req, res) => {
  try {
    const { content, active } = req.body;

    const updateData = {};

    if (typeof content === 'string') {
      if (!content.trim()) {
        return res.status(400).json({
          message: 'Nội dung mẫu không được để trống',
        });
      }

      updateData.content = content.trim();
    }

    if (typeof active === 'boolean') {
      updateData.active = active;
    }

    const updated = await StudentNoteTemplate.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        message: 'Không tìm thấy ghi chú mẫu',
      });
    }

    res.json({
      message: 'Đã cập nhật ghi chú mẫu',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Xóa mẫu
exports.deleteTemplate = async (req, res) => {
  try {
    const deleted = await StudentNoteTemplate.findByIdAndDelete(
      req.params.id
    );

    if (!deleted) {
      return res.status(404).json({
        message: 'Không tìm thấy ghi chú mẫu',
      });
    }

    res.json({
      message: 'Đã xóa ghi chú mẫu',
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
