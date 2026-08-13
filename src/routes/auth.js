const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Endpoint Public (Tanpa Login)
router.post('/login', authController.login);

// Endpoint Protected (Wajib Login / Bawa Token)
router.get('/me', verifyToken, authController.getProfile);

module.exports = router;