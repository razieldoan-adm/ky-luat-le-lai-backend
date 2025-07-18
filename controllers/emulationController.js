// controllers/emulationController.js

const ClassWeeklyScore = require('../models/ClassWeeklyScore');

/**
 * Lấy danh sách lớp đạt top X hạng cao 2 tuần liên tiếp
 */
exports.getTopRankedClassesContinuous = async (req, res) => {
  const top = parseInt(req.query.top) || 3;

  try {
    const weeks = await ClassWeeklyScore.distinct('weekNumber');
    weeks.sort((a,b) => b - a); // ✅ sửa lỗi tại đây

    if (weeks.length < 2) {
      return res.status(200).json([]); // Không đủ dữ liệu 2 tuần
    }

    const [currentWeek, prevWeek] = weeks;

    const currentTop = await ClassWeeklyScore.find({
      weekNumber: currentWeek,
      rank: { $lte: top }
    });

    const prevTop = await ClassWeeklyScore.find({
      weekNumber: prevWeek,
      rank: { $lte: top }
    });

    const prevClassNames = prevTop.map(c => c.className);
    const continuousTop = currentTop.filter(c => prevClassNames.includes(c.className));

    res.json(continuousTop);
  } catch (err) {
    console.error('Lỗi getTopRankedClassesContinuous:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


/**
 * Lấy danh sách lớp đứng hạng thấp 2 tuần liên tiếp
 */
exports.getBottomRankedClassesContinuous = async (req, res) => {
  const bottom = parseInt(req.query.bottom) || 3;

  try {
    const weeks = await ClassWeeklyScore.distinct('weekNumber');
    weeks.sort((a,b) => b - a); // ✅ sửa tại đây

    if (weeks.length < 2) {
      return res.status(200).json([]); // Không đủ dữ liệu 2 tuần
    }

    const [currentWeek, prevWeek] = weeks;

    // Lấy tổng số lớp trong tuần hiện tại
    const totalClasses = await ClassWeeklyScore.countDocuments({ weekNumber: currentWeek });

    const currentBottom = await ClassWeeklyScore.find({
      weekNumber: currentWeek,
      rank: { $gte: totalClasses - bottom + 1 }
    });

    const prevBottom = await ClassWeeklyScore.find({
      weekNumber: prevWeek,
      rank: { $gte: totalClasses - bottom + 1 }
    });

    const prevClassNames = prevBottom.map(c => c.className);
    const continuousBottom = currentBottom.filter(c => prevClassNames.includes(c.className));

    res.json(continuousBottom);
  } catch (err) {
    console.error('Lỗi getBottomRankedClassesContinuous:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getTop1EachGradeCurrentWeek = async (req, res) => {
  try {
    // Lấy tuần hiện tại
    const latestWeek = await ClassWeeklyScore.findOne().sort({ weekNumber: -1 }).select('weekNumber').lean();
    if (!latestWeek) return res.status(200).json([]);

    const currentWeek = latestWeek.weekNumber;

    // Aggregate top 1 mỗi khối
    const top1 = await ClassWeeklyScore.aggregate([
      { $match: { weekNumber: currentWeek } },
      { $sort: { grade: 1, rank: 1 } },
      {
        $group: {
          _id: "$grade",
          className: { $first: "$className" },
          rank: { $first: "$rank" }
        }
      },
      {
        $project: {
          _id: 0,
          grade: "$_id",
          className: 1,
          rank: 1
        }
      },
      { $sort: { grade: 1 } }
    ]);

    res.json(top1);
  } catch (err) {
    console.error('Lỗi getTop1EachGradeCurrentWeek:', err);
    res.status(500).json({ error: 'Server error' });
  }
};