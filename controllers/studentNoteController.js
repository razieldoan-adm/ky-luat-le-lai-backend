const StudentNote = require('../models/StudentNote');
const Student = require('../models/Student');

// Chuẩn hóa danh sách học sinh từ ID
const getStudents = async (studentIds) => {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new Error('Vui lòng chọn ít nhất một học sinh');
  }

  const uniqueIds = [...new Set(studentIds.map(String))];

  const students = await Student.find({
    _id: { $in: uniqueIds },
  }).select('_id name className');

  if (students.length !== uniqueIds.length) {
    throw new Error('Có học sinh không tồn tại trong hệ thống');
  }

  return uniqueIds.map((id) => {
    const student = students.find(
      (s) => s._id.toString() === id
    );

    return {
      studentId: student._id,
      studentName: student.name,
      className: student.className,
    };
  });
};

// Lấy danh sách ghi nhận
exports.getStudentNotes = async (req, res) => {
  try {
    const { keyword } = req.query;

    const notes = await StudentNote.find().sort({
      createdAt: -1,
    });

    let result = notes;

    if (keyword && keyword.trim()) {
      const search = keyword.trim().toLowerCase();

      result = notes.filter((item) => {
        return (
          item.note.toLowerCase().includes(search) ||
          item.students.some(
            (s) =>
              s.studentName.toLowerCase().includes(search) ||
              s.className.toLowerCase().includes(search)
          )
        );
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi lấy danh sách ghi chú',
      error: error.message,
    });
  }
};

// Tạo ghi nhận mới
exports.createStudentNote = async (req, res) => {
  try {
    const { studentIds, note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        message: 'Vui lòng nhập nội dung ghi chú',
      });
    }

    const students = await getStudents(studentIds);

    const newNote = await StudentNote.create({
      students,
      note: note.trim(),
    });

    res.status(201).json({
      message: 'Đã lưu ghi nhận thành công',
      data: newNote,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// Chỉnh sửa ghi nhận
exports.updateStudentNote = async (req, res) => {
  try {
    const { studentIds, note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        message: 'Vui lòng nhập nội dung ghi chú',
      });
    }

    const students = await getStudents(studentIds);

    const updated = await StudentNote.findByIdAndUpdate(
      req.params.id,
      {
        students,
        note: note.trim(),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        message: 'Không tìm thấy ghi nhận',
      });
    }

    res.json({
      message: 'Đã cập nhật ghi nhận',
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// Xóa ghi nhận
exports.deleteStudentNote = async (req, res) => {
  try {
    const deleted = await StudentNote.findByIdAndDelete(
      req.params.id
    );

    if (!deleted) {
      return res.status(404).json({
        message: 'Không tìm thấy ghi nhận',
      });
    }

    res.json({
      message: 'Đã xóa ghi nhận',
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
