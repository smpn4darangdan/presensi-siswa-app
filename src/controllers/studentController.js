const db = require('../config/db');

// Get All Students (Dengan Data Rombel)
const getAllStudents = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        s.id, s.nis, s.nisn, s.nama, s.jenis_kelamin, s.tanggal_lahir, 
        s.status_aktif, s.qr_code, r.nama_rombel, r.tingkat
      FROM students s
      LEFT JOIN rombels r ON s.rombel_id = r.id
      WHERE s.status_aktif = true
      ORDER BY s.nama ASC
    `);
    
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// Create Student
const createStudent = async (req, res, next) => {
  try {
    const { nis, nisn, nama, jenis_kelamin, tanggal_lahir, rombel_id } = req.body;

    if (!nis || !nisn || !nama) {
      return res.status(400).json({
        success: false,
        message: 'NIS, NISN, dan Nama wajib diisi!'
      });
    }

    // Auto-generate QR Code string unik berbasis NIS
    const qr_code = `STUDENT_ID:${nis}`;

    const result = await db.query(
      `INSERT INTO students (nis, nisn, nama, jenis_kelamin, tanggal_lahir, rombel_id, qr_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nis, nisn, nama, jenis_kelamin, tanggal_lahir, rombel_id, qr_code]
    );

    res.status(201).json({
      success: true,
      message: 'Siswa berhasil ditambahkan!',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllStudents,
  createStudent
};