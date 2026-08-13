const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, studentController.getAllStudents);
router.post('/', verifyToken, requireRole('ADMIN'), studentController.createStudent);

module.exports = router;