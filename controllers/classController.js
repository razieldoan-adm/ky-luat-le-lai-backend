const Class = require('../models/Class');
const Violation = require('../models/Violation');

// Thêm hoặc cập nhật GVCN cho lớp
exports.createOrUpdateClass = async (req, res) => {
  try {
    const className = req.body.className?.toUpperCase()?.trim();
    const teacher = req.body.teacher?.trim();

    if (!className || !teacher) {
      return res.status(400).json({ error: 'Thiếu tên lớp hoặc GVCN' });
    }

    const updated = await Class.findOneAndUpdate(
      { className },
      { className, teacher },
      { upsert: true, new: true }
    );

    res.status(201).json(updated);
  } catch (err) {
    console.error('Lỗi khi thêm lớp:', err);
    res.status(500).json({ error: 'Lỗi server khi thêm lớp' });
  }
};

// Lấy danh sách tất cả lớp
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find().sort({ className: 1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: 'Không thể lấy danh sách lớp' });
  }
};
// Lấy danh sách lop có GVCN
exports.getClassesWithTeacher = async (req, res) => {
  try {
    const classes = await Class.find({ teacher: { $ne: '' } }) 
    .select('className grade teacher') 
    .sort({ className: 1 });
    
    res.json(classes);
    
  } catch (err) {
    res.status(500).json({ error: 'Không thể lấy danh sách lớp' });
  }
};

// ham tinh diem ky luat real time


exports.getClassDisciplineSummary = async (req, res) => {
  try {
    const classes = await Class.find({}).lean();

    // Duyệt từng lớp
    const results = await Promise.all(classes.map(async (cls) => {
      // Lấy vi phạm thuộc lớp đó
      const violations = await Violation.find({ className: cls.className });

      const totalPenalty = violations.reduce((sum, v) => sum + (v.penalty || 0), 0);

      return {
        className: cls.className,
        grade: cls.grade,
        homeroomTeacher: cls.homeroomTeacher,
        totalPenalty
      };
    }))
    res.json(results);
  } catch (error) {
    console.error('Lỗi khi tính điểm kỷ luật lớp:', error);
    res.status(500).json({ error: 'Lỗi server khi tính điểm kỷ luật' });
  }
};

exports.getClassCount = async (req, res) => {
  try {
    const count = await Class.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};