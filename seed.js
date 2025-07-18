require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('Connected DB');

  const admin = new User({
    username: 'admin1',
    password: '123', // 👉 plaintext, schema sẽ tự hash đúng chuẩn
    role: 'admin',
  });
  await admin.save();

  console.log('✅ Seeded admin user');
  process.exit();
});
