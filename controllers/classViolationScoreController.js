const ClassViolationScore = require('../models/ClassViolationScore');
const AcademicWeek = require('../models/AcademicWeek');
// Tạo mới hoặc cập nhật điểm thi đua kỷ luật lớp theo tuần
const Class = require('../models/Class'); // đảm bảo import model Class
const Violation = require('../models/Violation');
const LeaveApplication = require('../models/LeaveApplication');

exports.createOrUpdateClassViolationScore = async (req, res) => {
  try {
    const { className, weekNumber, totalScore } = req.body;

    if (!className || !weekNumber || totalScore == null) {
      return res.status(400).json({ message: 'Thiếu dữ liệu cần thiết.' });
    }

    // Kiểm tra tồn tại
    let record = await ClassViolationScore.findOne({ className, weekNumber });

    if (record) {
      // Nếu đã tồn tại, cập nhật
      record.totalScore = totalScore;
      await record.save();
    } else {
      // Nếu chưa tồn tại, tạo mới
      record = await ClassViolationScore.create({
        className,
        weekNumber,
        totalScore,
      });
    }

    res.json(record);
  } catch (err) {
    console.error('Lỗi tạo/cập nhật class violation score:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};


// Lấy điểm thi đua kỷ luật của lớp theo tuần
exports.getClassViolationScore = async (req, res) => {
  try {
    const { className, weekNumber } = req.params;

    const record = await ClassViolationScore.findOne({ className, weekNumber })
      .populate('className', 'name')
      .populate('weekNumber', 'name startDate endDate');

    if (!record) {
      return res.status(404).json({ message: 'Không tìm thấy điểm thi đua.' });
    }

    res.json(record);
  } catch (err) {
    console.error('Lỗi lấy class violation score:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getByWeek = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    const scores = await ClassViolationScore.find({ weekNumber });
    res.json(scores);
  } catch (err) {
    console.error("Lỗi lấy violation scores:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// ============================================================
// 🧮 API TÍNH ĐIỂM VI PHẠM THI ĐUA LỚP
//
// Quy tắc:
// - Chỉ tính các vi phạm PGT xử lý
// - APPROVED  → không tính điểm thi đua lớp
// - PENDING   → vẫn tính
// - REJECTED  → vẫn tính
// - OVERDUE   → vẫn tính
// - Không có đơn → vẫn tính
//
// Lưu ý:
// API này CHỈ tính điểm thi đua lớp.
// KHÔNG ảnh hưởng StudentConductScore.
// ============================================================

exports.calculateClassViolationScores = async (req, res) => {
  try {
    const { weekNumber, academicYear } = req.query;

    // ----------------------------------------------------------
    // VALIDATE
    // ----------------------------------------------------------

    if (
      weekNumber === undefined ||
      weekNumber === null ||
      !academicYear
    ) {
      return res.status(400).json({
        success: false,
        message: "Thiếu weekNumber hoặc academicYear.",
      });
    }

    const week = Number(weekNumber);
    const year = String(academicYear).trim();

    if (!Number.isInteger(week) || week < 1) {
      return res.status(400).json({
        success: false,
        message: "weekNumber không hợp lệ.",
      });
    }

    // ----------------------------------------------------------
    // 1. LẤY CÁC VI PHẠM ĐƯỢC TÍNH THI ĐUA
    // ----------------------------------------------------------

    const violations = await Violation.find({
      academicYear: year,
      weekNumber: week,
      handled: true,
      handledBy: {
        $in: ["PGT", "PGT xử lý"],
      },
    }).lean();

    // ----------------------------------------------------------
    // 2. LẤY CÁC ĐƠN ĐÃ ĐƯỢC DUYỆT
    // ----------------------------------------------------------

    const violationIds = violations.map(
      (violation) => violation._id
    );

    const approvedApplications =
      violationIds.length > 0
        ? await LeaveApplication.find({
            violationId: {
              $in: violationIds,
            },
            status: "APPROVED",
          })
            .select("violationId")
            .lean()
        : [];

    // ----------------------------------------------------------
    // 3. TẠO SET CÁC VI PHẠM ĐƯỢC MIỄN ĐIỂM
    // ----------------------------------------------------------

    const approvedViolationIds = new Set(
      approvedApplications.map(
        (application) =>
          String(application.violationId)
      )
    );

    // ----------------------------------------------------------
    // 4. TÍNH ĐIỂM THEO LỚP
    // ----------------------------------------------------------

    const classMap = new Map();

    for (const violation of violations) {
      const className = String(
        violation.className || ""
      )
        .trim()
        .toUpperCase();

      if (!className) continue;

      if (!classMap.has(className)) {
        classMap.set(className, {
          className,
          totalScore: 0,
          count: 0,
          approvedCount: 0,
          violations: [],
        });
      }

      const row = classMap.get(className);

      const isApproved =
        approvedViolationIds.has(
          String(violation._id)
        );

      const penalty = Number(
        violation.penalty || 0
      );

      // --------------------------------------------------------
      // APPROVED → KHÔNG TRỪ ĐIỂM THI ĐUA LỚP
      // --------------------------------------------------------

      if (isApproved) {
        row.approvedCount += 1;

        row.violations.push({
          violationId: violation._id,
          studentName: violation.name,
          description: violation.description,
          penalty,
          status: "APPROVED",
          counted: false,
        });

        continue;
      }

      // --------------------------------------------------------
      // CÁC TRẠNG THÁI KHÁC → TÍNH ĐIỂM
      // --------------------------------------------------------

      row.totalScore += penalty;
      row.count += 1;

      row.violations.push({
        violationId: violation._id,
        studentName: violation.name,
        description: violation.description,
        penalty,
        status: "COUNTED",
        counted: true,
      });
    }

    // ----------------------------------------------------------
    // 5. CHUYỂN MAP → ARRAY
    // ----------------------------------------------------------

    const data = Array.from(
      classMap.values()
    ).sort((a, b) =>
      a.className.localeCompare(
        b.className,
        "vi"
      )
    );

    // ----------------------------------------------------------
    // 6. TRẢ KẾT QUẢ
    // ----------------------------------------------------------

    return res.json({
      success: true,
      academicYear: year,
      weekNumber: week,
      totalViolations: violations.length,
      totalApproved: approvedApplications.length,
      data,
    });
  } catch (error) {
    console.error(
      "❌ calculateClassViolationScores:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể tính điểm vi phạm thi đua lớp.",
      error: error.message,
    });
  }
};
