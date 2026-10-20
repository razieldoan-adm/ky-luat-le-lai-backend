const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const {  getAllRules, getRuleGroups, createRuleGroup, createRule, updateRule, deleteRule, importRules } = require('../controllers/rulesController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// Thêm 2 route này trước router.get('/:id') nếu dự án có route động tương tự:
router.get('/groups', verifyToken, isAdmin, getRuleGroups);
router.post('/groups', verifyToken, isAdmin, createRuleGroup);

router.get('/', getAllRules);
router.post('/', verifyToken, isAdmin, createRule);
router.put('/:id', verifyToken, isAdmin, updateRule);
router.delete('/:id', verifyToken, isAdmin, deleteRule);
router.post('/import', verifyToken, isAdmin, upload.single('file'), importRules);

module.exports = router;
