const User = require('../models/User');

// GET all users
exports.getAllUsers = async (req, res) => {
  const users = await User.find({});
  res.json(users);
};

// POST create user
exports.createUser = async (req, res) => {
  const { username, password, role } = req.body;

  const userExists = await User.findOne({ username });
  if (userExists) return res.status(400).json({ message: 'User đã tồn tại' });

  const user = new User({ username, password, role });
  await user.save();
  res.status(201).json(user);
};

// PUT update user role
exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

  user.role = role;
  await user.save();
  res.json(user);
};

// DELETE user
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

  await user.deleteOne();
  res.json({ message: 'Đã xoá user' });
};
