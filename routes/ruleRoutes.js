const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const { getAllRules, createRule, updateRule, deleteRule, importRules } = require('../controllers/rulesController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

router.get('/', getAllRules);
router.post('/', verifyToken, isAdmin, createRule);
router.put('/:id', verifyToken, isAdmin, updateRule);
router.delete('/:id', verifyToken, isAdmin, deleteRule);
router.post('/import', verifyToken, isAdmin, upload.single('file'), importRules);

module.exports = router;
