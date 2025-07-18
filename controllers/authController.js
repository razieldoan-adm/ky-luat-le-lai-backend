const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại.' });
    }

    const isMatch = await user.matchPassword(password); // 🔑 So sánh bằng bcrypt compare

    if (!isMatch) {
      return res.status(401).json({ message: 'Sai mật khẩu.' });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, role: user.role });
  } catch (error) {
    console.error('❌ Lỗi login:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};
