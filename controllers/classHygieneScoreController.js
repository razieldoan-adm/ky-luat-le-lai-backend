const ClassHygieneScore = require("../models/ClassHygieneScore");
const Class = require("../models/Class"); // Cần Model Class để lấy classId nếu Frontend không cung cấp

// --- CÁC HẰNG SỐ CƠ BẢN (Đồng bộ với Frontend) ---
const DAYS_COUNT = 5; // Thứ 2 -> Thứ 6
const SESSIONS_PER_DAY = 2; // Sáng, Chiều
const TYPES_PER_SESSION = 3; // 3 loại lỗi (absentDuty, noLightFan, notClosedDoor)
const SLOT_PER_DAY = SESSIONS_PER_DAY * TYPES_PER_SESSION; // 6 điểm/ngày
const TOTAL_SLOTS = DAYS_COUNT * SLOT_PER_DAY; // 30 điểm/tuần

// Lỗi 1, 2, 3 tương ứng với các trường trong Model
const VIOLATION_FIELDS = ["absentDuty", "noLightFan", "notClosedDoor"];

// Hàm Helper: Tính tổng điểm bị trừ
const calculateTotalViolations = (scores) => (scores || []).filter((s) => s === 1).length;

// Hàm Helper: Lấy ngày bắt đầu tuần (Thứ Hai) từ một ngày bất kỳ trong tuần
const getWeekStartDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 0=CN, 1=T2. Đảm bảo start là T2
    d.setDate(diff);
    return d;
};

// Hàm Helper: Ánh xạ mảng 30 điểm (Frontend) sang 5 bản ghi chi tiết theo ngày (DB)
const mapScoresToDailyRecords = (classScores, weekStartDate, weekNumber) => {
    const records = [];
    const startDate = getWeekStartDate(weekStartDate);

    for (let dIdx = 0; dIdx < DAYS_COUNT; dIdx++) {
        const day = new Date(startDate);
        day.setDate(day.getDate() + dIdx); // Ngày thực (T2, T3, T4, T5, T6)

        // Lấy 6 điểm của ngày này (3 sáng, 3 chiều)
        const dailyScores = classScores.scores.slice(
            dIdx * SLOT_PER_DAY,
            (dIdx + 1) * SLOT_PER_DAY
        );

        const morningScores = dailyScores.slice(0, TYPES_PER_SESSION);
        const afternoonScores = dailyScores.slice(TYPES_PER_SESSION, SLOT_PER_DAY);
        
        // Tạo cấu trúc bản ghi DB
        records.push({
            classId: classScores.classId,
            className: classScores.className,
            grade: classScores.grade,
            date: day,
            weekNumber: weekNumber,
            sessions: {
                morning: {
                    absentDuty: morningScores[0] || 0,
                    noLightFan: morningScores[1] || 0,
                    notClosedDoor: morningScores[2] || 0,
                },
                afternoon: {
                    absentDuty: afternoonScores[0] || 0,
                    noLightFan: afternoonScores[1] || 0,
                    notClosedDoor: afternoonScores[2] || 0,
                },
            },
        });
    }
    return records;
};

// Hàm Helper: Ánh xạ 5 bản ghi theo ngày (DB) sang mảng 30 điểm (Frontend)
const mapDailyRecordsToWeeklyScores = (dailyScores) => {
    const weeklyData = {}; // { classId: { ...data, scores: [30 điểm] } }

    dailyScores.forEach(s => {
        const cId = s.classId._id.toString();
        if (!weeklyData[cId]) {
            weeklyData[cId] = {
                classId: cId,
                className: s.className,
                grade: s.grade,
                scores: Array(TOTAL_SLOTS).fill(0),
            };
        }
        
        // Tính vị trí ngày trong tuần (0=T2, 1=T3, ..., 4=T6)
        // Date.getDay(): 0=CN, 1=T2, ..., 6=T7
        const dbDay = new Date(s.date).getDay();
        const dayOfWeekIndex = dbDay === 0 ? 6 : dbDay - 1; // 0=T2, 1=T3, ..., 4=T6

        // Ánh xạ 6 lỗi vào vị trí đúng trong mảng 30 điểm (Chỉ xử lý T2-T6)
        if (dayOfWeekIndex >= 0 && dayOfWeekIndex < DAYS_COUNT) {
            const baseIndex = dayOfWeekIndex * SLOT_PER_DAY; // 6 điểm/ngày
            
            // Buổi sáng (3 lỗi)
            weeklyData[cId].scores[baseIndex + 0] = s.sessions.morning.absentDuty;
            weeklyData[cId].scores[baseIndex + 1] = s.sessions.morning.noLightFan;
            weeklyData[cId].scores[baseIndex + 2] = s.sessions.morning.notClosedDoor;
            
            // Buổi chiều (3 lỗi)
            weeklyData[cId].scores[baseIndex + 3] = s.sessions.afternoon.absentDuty;
            weeklyData[cId].scores[baseIndex + 4] = s.sessions.afternoon.noLightFan;
            weeklyData[cId].scores[baseIndex + 5] = s.sessions.afternoon.notClosedDoor;
        }
    });

    return Object.values(weeklyData);
};


// -----------------------------------------------------------------
// ----------------------- HÀM CHÍNH -------------------------------
// -----------------------------------------------------------------

// [POST] /api/class-hygiene-scores
const saveClassHygieneScores = async (req, res) => {
  try {
    // Nhận dữ liệu tuần từ Frontend
    const { weekNumber, scores: weeklyScores, weekStartDate } = req.body; 

    if (!weekNumber || !weeklyScores || !weekStartDate) {
      return res.status(400).json({ message: "Thiếu dữ liệu weekNumber, scores hoặc weekStartDate." });
    }
    
    for (const classScores of weeklyScores) {
        // Chuyển đổi mảng 30 điểm thành 5 bản ghi chi tiết theo ngày
        const dailyRecords = mapScoresToDailyRecords(classScores, weekStartDate, weekNumber);

        // Lưu/Cập nhật từng bản ghi ngày
        for (const rec of dailyRecords) {
            await ClassHygieneScore.findOneAndUpdate(
                { 
                    classId: rec.classId, 
                    date: rec.date, // Tìm theo ngày
                    weekNumber: rec.weekNumber 
                }, 
                {
                    className: rec.className,
                    grade: rec.grade,
                    sessions: rec.sessions, // Lưu chi tiết 6 lỗi
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }
    }

    res.json({ message: "Đã lưu điểm vệ sinh thành công chi tiết theo ngày." });
  } catch (err) {
    console.error("❌ Lỗi khi lưu hygiene scores:", err);
    res.status(500).json({ error: "Lỗi server", detail: err.message });
  }
};

// [GET] /api/class-hygiene-scores/by-week
const getByWeek = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    if (!weekNumber) return res.status(400).json({ message: "Thiếu weekNumber" });

    // Lấy tất cả bản ghi chi tiết theo ngày của tuần
    const dailyScores = await ClassHygieneScore.find({ weekNumber: Number(weekNumber) })
      .populate("classId", "name _id"); // Cần lấy _id của Class
    
    // Ánh xạ 5 bản ghi/lớp thành mảng 30 điểm/lớp để Frontend hiển thị
    const weeklyScores = mapDailyRecordsToWeeklyScores(dailyScores);

    res.json(weeklyScores);
  } catch (err) {
    console.error("❌ Lỗi khi lấy điểm vệ sinh theo tuần:", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
};

// [GET] /api/class-hygiene-scores/summary (Có thể dùng để xuất báo cáo)
// Trả về tổng số lần vi phạm của mỗi lớp trong tuần
const getSummaryByWeek = async (req, res) => {
    try {
        const { weekNumber } = req.query;
        if (!weekNumber) return res.status(400).json({ message: "Thiếu weekNumber" });

        const dailyScores = await ClassHygieneScore.find({ weekNumber: Number(weekNumber) })
            .populate("classId", "name grade _id");

        const summaryMap = {}; // { classId: { totalViolations: 0, ... } }
        
        dailyScores.forEach(s => {
            const cId = s.classId._id.toString();
            if (!summaryMap[cId]) {
                summaryMap[cId] = {
                    classId: cId,
                    className: s.className,
                    grade: s.grade,
                    totalViolations: 0,
                    // Có thể thêm chi tiết hơn nếu cần
                };
            }
            
            // Tính tổng 6 lỗi của ngày hôm đó
            const dailyViolation = s.sessions.morning.absentDuty + s.sessions.morning.noLightFan + s.sessions.morning.notClosedDoor + 
                                   s.sessions.afternoon.absentDuty + s.sessions.afternoon.noLightFan + s.sessions.afternoon.notClosedDoor;

            summaryMap[cId].totalViolations += dailyViolation;
        });

        // Áp dụng điểm trừ (Giả định 1 vi phạm trừ 1 điểm)
        const summary = Object.values(summaryMap).map(item => ({
            ...item,
            totalPenalty: item.totalViolations * 1 // Giả định điểm trừ là 1/lỗi
        }));

        res.json(summary);
    } catch (err) {
        console.error("❌ Lỗi khi lấy summary:", err);
        res.status(500).json({ message: "Server error", detail: err.message });
    }
};

module.exports = {
  saveClassHygieneScores,
  getByWeek,
  // getByWeekAndClass, // Có thể bỏ qua nếu không dùng
  getSummaryByWeek,
};
