const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config');

// 1. Fungsi Login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi!'
      });
    }

    // Cari user di database
    const userQuery = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userQuery.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah!'
      });
    }

    if (!user.status_aktif) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan. Silakan hubungi Administrator!'
      });
    }

    // Cek Password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah!'
      });
    }

    // Generate JWT Token (berlaku 1 hari)
    const tokenPayload = {
      id: user.id,
      nama: user.nama,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '1d' });

    res.status(200).json({
      success: true,
      message: 'Login berhasil!',
      data: {
        token,
        user: tokenPayload
      }
    });
  } catch (err) {
    next(err);
  }
};

// 2. Cek Profile User Saat Ini
const getProfile = async (req, res, next) => {
  try {
    const userQuery = await db.query(
      'SELECT id, nip, nama, username, role, status_aktif, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = userQuery.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan!'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  getProfile
};