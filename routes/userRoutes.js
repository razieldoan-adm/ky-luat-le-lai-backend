const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, updateUserRole, deleteUser } = require('../controllers/userController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// GET all users
router.get('/', verifyToken, isAdmin, getAllUsers);

// POST create new user
router.post('/', verifyToken, isAdmin, createUser);

// PUT update user role
router.put('/:id', verifyToken, isAdmin, updateUserRole);

// DELETE user
router.delete('/:id', verifyToken, isAdmin, deleteUser);

module.exports = router;
