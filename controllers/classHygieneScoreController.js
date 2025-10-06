const ClassHygieneScore = require("../models/ClassHygieneScore");
// Không cần Class Model nữa nếu không dùng populate

// --- CÁC HẰNG SỐ VÀ HÀM HELPER GIỮ NGUYÊN ---
const DAYS_COUNT = 5; 
const SESSIONS_PER_DAY = 2; 
const TYPES_PER_SESSION = 3; 
const SLOT_PER_DAY = SESSIONS_PER_DAY * TYPES_PER_SESSION; 
const TOTAL_SLOTS = DAYS_COUNT * SLOT_PER_DAY; 

// Hàm Helper: Lấy ngày bắt đầu tuần (Giữ nguyên)
const getWeekStartDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    d.setDate(diff);
    return d;
};

// Hàm Helper: Ánh xạ mảng 30 điểm (Frontend) sang 5 bản ghi chi tiết theo ngày (DB)
const mapScoresToDailyRecords = (classScores, weekStartDate, weekNumber) => {
    const records = [];
    const startDate = getWeekStartDate(weekStartDate);

    for (let dIdx = 0; dIdx < DAYS_COUNT; dIdx++) {
        const day = new Date(startDate);
        day.setDate(day.getDate() + dIdx); 

        const dailyScores = classScores.scores.slice(
            dIdx * SLOT_PER_DAY,
            (dIdx + 1) * SLOT_PER_DAY
        );

        const morningScores = dailyScores.slice(0, TYPES_PER_SESSION);
        const afternoonScores = dailyScores.slice(TYPES_PER_SESSION, SLOT_PER_DAY);
        
        // Cấu trúc bản ghi DB
        records.push({
            // LOẠI BỎ classId
            className: classScores.className, // Dùng className thay thế
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
    const weeklyData = {}; // { className: { ...data, scores: [30 điểm] } }

    dailyScores.forEach(s => {
        const cName = s.className; // Dùng className làm khóa
        if (!weeklyData[cName]) {
            weeklyData[cName] = {
                // LOẠI BỎ classId
                className: s.className,
                grade: s.grade,
                scores: Array(TOTAL_SLOTS).fill(0),
            };
        }
        
        const dbDay = new Date(s.date).getDay();
        const dayOfWeekIndex = dbDay === 0 ? 6 : dbDay - 1; 

        if (dayOfWeekIndex >= 0 && dayOfWeekIndex < DAYS_COUNT) {
            const baseIndex = dayOfWeekIndex * SLOT_PER_DAY;
            
            // Buổi sáng (3 lỗi)
            weeklyData[cName].scores[baseIndex + 0] = s.sessions.morning.absentDuty;
            weeklyData[cName].scores[baseIndex + 1] = s.sessions.morning.noLightFan;
            weeklyData[cName].scores[baseIndex + 2] = s.sessions.morning.notClosedDoor;
            
            // Buổi chiều (3 lỗi)
            weeklyData[cName].scores[baseIndex + 3] = s.sessions.afternoon.absentDuty;
            weeklyData[cName].scores[baseIndex + 4] = s.sessions.afternoon.noLightFan;
            weeklyData[cName].scores[baseIndex + 5] = s.sessions.afternoon.notClosedDoor;
        }
    });

    return Object.values(weeklyData);
};


// ----------------------- HÀM CHÍNH -------------------------------

// [POST] /api/class-hygiene-scores
const saveClassHygieneScores = async (req, res) => {
    try {
        const { weekNumber, scores: weeklyScores, weekStartDate } = req.body; 

        if (!weekNumber || !weeklyScores || !weekStartDate) {
            return res.status(400).json({ message: "Thiếu dữ liệu weekNumber, scores hoặc weekStartDate." });
        }
        
        for (const classScores of weeklyScores) {
            const dailyRecords = mapScoresToDailyRecords(classScores, weekStartDate, weekNumber);

            for (const rec of dailyRecords) {
                await ClassHygieneScore.findOneAndUpdate(
                    { 
                        className: rec.className, // Dùng className thay classId
                        date: rec.date, 
                        weekNumber: rec.weekNumber 
                    }, 
                    {
                        className: rec.className,
                        grade: rec.grade,
                        sessions: rec.sessions, 
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

        // Không cần populate vì không dùng classId
        const dailyScores = await ClassHygieneScore.find({ weekNumber: Number(weekNumber) })
            .select("className grade date sessions"); 
        
        const weeklyScores = mapDailyRecordsToWeeklyScores(dailyScores);

        res.json(weeklyScores);
    } catch (err) {
        console.error("❌ Lỗi khi lấy điểm vệ sinh theo tuần:", err);
        res.status(500).json({ error: "Server error", detail: err.message });
    }
};

// [GET] /api/class-hygiene-scores/summary (Có thể dùng để xuất báo cáo)
const getSummaryByWeek = async (req, res) => {
    try {
        const { weekNumber } = req.query;
        if (!weekNumber) return res.status(400).json({ message: "Thiếu weekNumber" });

        const dailyScores = await ClassHygieneScore.find({ weekNumber: Number(weekNumber) });

        const summaryMap = {}; // { className: { totalViolations: 0, ... } }
        
        dailyScores.forEach(s => {
            const cName = s.className; // Dùng className làm khóa
            if (!summaryMap[cName]) {
                summaryMap[cName] = {
                    className: s.className,
                    grade: s.grade,
                    totalViolations: 0,
                };
            }
            
            // Tính tổng 6 lỗi của ngày hôm đó
            const dailyViolation = s.sessions.morning.absentDuty + s.sessions.morning.noLightFan + s.sessions.morning.notClosedDoor + 
                                   s.sessions.afternoon.absentDuty + s.sessions.afternoon.noLightFan + s.sessions.afternoon.notClosedDoor;

            summaryMap[cName].totalViolations += dailyViolation;
        });

        // Áp dụng điểm trừ (Giả định 1 vi phạm trừ 1 điểm)
        const summary = Object.values(summaryMap).map(item => ({
            ...item,
            totalPenalty: item.totalViolations * 1 
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
    getSummaryByWeek,
};
