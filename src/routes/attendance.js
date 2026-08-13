const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Endpoint Scan QR (Bisa diakses ADMIN & PETUGAS)
router.post('/scan', verifyToken, requireRole('ADMIN', 'PETUGAS'), attendanceController.scanQr);

// Endpoint Laporan Presensi Hari Ini
router.get('/today', verifyToken, attendanceController.getTodayAttendance);

module.exports = router;