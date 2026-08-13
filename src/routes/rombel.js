const express = require('express');
const router = express.Router();
const rombelController = require('../controllers/rombelController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, rombelController.getAllRombels);
router.post('/', verifyToken, requireRole('ADMIN'), rombelController.createRombel);

module.exports = router;