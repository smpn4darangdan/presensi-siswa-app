const db = require('../config/db');

// 1. Scan QR Code untuk Presensi (Masuk/Pulang)
const scanQr = async (req, res, next) => {
  try {
    const { qr_code } = req.body;
    const petugas_id = req.user.id; // Diambil dari JWT Token

    if (!qr_code) {
      return res.status(400).json({
        success: false,
        message: 'QR Code wajib di-scan!'
      });
    }

    // A. Cari Siswa Berdasarkan QR Code
    const studentQuery = await db.query(
      `SELECT s.*, r.nama_rombel 
       FROM students s 
       LEFT JOIN rombels r ON s.rombel_id = r.id 
       WHERE s.qr_code = $1 AND s.status_aktif = true`,
      [qr_code]
    );

    const student = studentQuery.rows[0];
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Siswa tidak ditemukan atau status siswa tidak aktif!'
      });
    }

    // B. Ambil Aturan Waktu Presensi
    const settingsQuery = await db.query('SELECT * FROM attendance_settings LIMIT 1');
    const settings = settingsQuery.rows[0];

    if (!settings) {
      return res.status(500).json({
        success: false,
        message: 'Pengaturan jam presensi belum diset oleh Administrator!'
      });
    }

    // Waktu & Tanggal Sekarang
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTimeStr = now.toTimeString().split(' ')[0]; // "HH:MM:SS"

    // C. Tentukan Tipe Presensi (MASUK atau PULANG)
    let tipe = null;
    let status = 'HADIR';

    if (currentTimeStr >= settings.jam_masuk_mulai && currentTimeStr <= settings.jam_masuk_selesai) {
      tipe = 'MASUK';
      // Cek apakah terlambat (Misal toleransi masuk s/d jam_masuk_mulai + batas tertentu)
      // Jika scan di atas jam_masuk_mulai misal batas jam 07:00, kita set logika sederhana:
      if (currentTimeStr > '07:00:00') {
        status = 'TERLAMBAT';
      }
    } else if (currentTimeStr >= settings.jam_pulang_mulai && currentTimeStr <= settings.jam_pulang_selesai) {
      tipe = 'PULANG';
      status = 'HADIR';
    } else {
      return res.status(400).json({
        success: false,
        message: `Presensi ditolak! Waktu sekarang (${currentTimeStr}) di luar jam presensi yang ditentukan.`
      });
    }

    // D. Cek Apakah Siswa Sudah Presensi Hari Ini untuk Tipe Tersebut
    const existingCheck = await db.query(
      'SELECT * FROM attendance WHERE siswa_id = $1 AND tanggal = $2 AND tipe = $3',
      [student.id, todayStr, tipe]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Siswa ${student.nama} sudah melakukan presensi ${tipe} hari ini!`
      });
    }

    // E. Simpan Data Presensi
    const insertRes = await db.query(
      `INSERT INTO attendance (siswa_id, tanggal, jam, tipe, status, petugas_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [student.id, todayStr, currentTimeStr, tipe, status, petugas_id]
    );

    res.status(201).json({
      success: true,
      message: `Presensi ${tipe} berhasil dicatat!`,
      data: {
        siswa: {
          nis: student.nis,
          nama: student.nama,
          rombel: student.nama_rombel
        },
        presensi: insertRes.rows[0]
      }
    });

  } catch (err) {
    next(err);
  }
};

// 2. Get Data Presensi Hari Ini
const getTodayAttendance = async (req, res, next) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const result = await db.query(
      `SELECT 
        a.id, a.tanggal, a.jam, a.tipe, a.status,
        s.nis, s.nama AS nama_siswa, r.nama_rombel,
        u.nama AS nama_petugas
       FROM attendance a
       JOIN students s ON a.siswa_id = s.id
       LEFT JOIN rombels r ON s.rombel_id = r.id
       LEFT JOIN users u ON a.petugas_id = u.id
       WHERE a.tanggal = $1
       ORDER BY a.jam DESC`,
      [todayStr]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  scanQr,
  getTodayAttendance
};