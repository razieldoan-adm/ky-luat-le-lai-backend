const mongoose = require('mongoose');
require('dotenv').config();

const Violation = require('./models/Violation');
const Rule = require('./models/Rule');
const AcademicWeek = require('./models/AcademicWeek');

async function seedViolations() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const students = [
    { name: 'Huy', className: '6A1' },
    { name: 'Lan', className: '6A2' },
    { name: 'Minh', className: '6A3' },
    { name: 'Trang', className: '6A4' },
  ];

  const rules = await Rule.find();
  const weeks = await AcademicWeek.find();

  if (weeks.length === 0) {
    console.log('❌ Không có dữ liệu tuần trong AcademicWeek. Hãy seed tuần trước.');
    process.exit(1);
  }

  const randomWeek = () => {
    const w = weeks[Math.floor(Math.random() * weeks.length)];
    return w.weekNumber;
  };

  const violationsToInsert = [];

  for (let i = 0; i < 10; i++) {
    const student = students[Math.floor(Math.random() * students.length)];
    const rule = rules[Math.floor(Math.random() * rules.length)];
    const week = (i % 4) + 1;

    violationsToInsert.push({
      name: student.name,
      className: student.className,
      description: rule.title,
      penalty: rule.point,
      handlingMethod: 'Nhắc nhở',
      handled: false,
      time: new Date(),
      weekNumber: week // ✅ thêm field weekNumber
    });
  }

  await Violation.insertMany(violationsToInsert);
  console.log('✅ Seeded violations with weekNumber successfully');

  mongoose.disconnect();
}

seedViolations();
