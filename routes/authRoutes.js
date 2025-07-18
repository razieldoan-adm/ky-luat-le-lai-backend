const express = require('express');
const router = express.Router();
const { loginUser, registerUser } = require('../controllers/authController');

// ✅ Login route
router.post('/login', loginUser);

// 🔑 Route tạo user (test)
// POST /api/auth/register { username, password, role }


module.exports = router;
