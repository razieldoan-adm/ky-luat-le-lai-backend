const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://luanvantotnghiepbk2:Poli1505@student-discipline.ttbfaff.mongodb.net/student-discipline?retryWrites=true&w=majority&appName=student-discipline');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
