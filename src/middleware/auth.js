const jwt = require('jsonwebtoken');
const config = require('../config');

// Middleware untuk memverifikasi token JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Token tidak ditemukan!'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // Menyimpan data user (id, username, role) ke request
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Token tidak valid atau sudah kedaluwarsa!'
    });
  }
};

// Middleware untuk membatasi akses berdasarkan Role (misal: 'ADMIN')
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini!'
      });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  requireRole
};