const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const violationRoutes = require('./routes/violationRoutes');
const ruleRoutes = require('./routes/ruleRoutes');
const classRoutes = require('./routes/classRoutes');
const settingRoutes = require('./routes/settingRoutes');
const classAcademicScoreRoutes = require('./routes/classAcademicScoresRoutes');
const emulationRoutes = require('./routes/emulationRoutes')

const academicWeekRoutes = require('./routes/academicWeekRoutes');
const settingTimeRoutes = require('./routes/settingTimeRoutes');
const classViolationScoreRoutes = require('./routes/classViolationScoreRoutes');
const classHygieneScoreRoutes = require('./routes/classHygieneScoreRoutes');
const classAttendanceSummaryRoutes = require('./routes/classAttendanceSummaryRoutes');
const classLineupSummaryRoutes = require('./routes/classLineUpSummaryRoutes');
const classWeeklyScoreRoutes = require('./routes/classWeeklyScoreRoutes');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['https://thcslelai-kyluat.vercel.app'],
  credentials: true,
}));

app.use(express.json());


//API cần sử dụng
app.use('/api/violations', violationRoutes);
app.use('/api/rules',ruleRoutes);

app.use('/api/classes',classRoutes);
app.use('/api/settings',settingRoutes);

app.use('/api/academic-weeks', academicWeekRoutes);
app.use('/api/settingtime', settingTimeRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/userRoutes', userRoutes);

app.use('/api/class-academic-scores', classAcademicScoreRoutes);
app.use('/api/class-violation-scores', classViolationScoreRoutes);
app.use('/api/class-hygiene-scores', classHygieneScoreRoutes);
app.use('/api/class-attendance-summaries', classAttendanceSummaryRoutes);
app.use('/api/class-lineup-summaries', classLineupSummaryRoutes);
app.use('/api/class-weekly-scores', classWeeklyScoreRoutes);
app.use('/api/class-rank', emulationRoutes);

// Serve static files from frontend build
const path = require('path');
app.use(express.static(path.join(__dirname, 'build'))); // nếu build frontend vào /build

// Catch-all route: serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {
 
})
.then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch((err) => console.error('MongoDB connection error:', err));
