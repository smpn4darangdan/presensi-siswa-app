const db = require('../config/db');

// Get All Rombels
const getAllRombels = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM rombels WHERE status_aktif = true ORDER BY tingkat, nama_rombel ASC'
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// Create Rombel
const createRombel = async (req, res, next) => {
  try {
    const { nama_rombel, tingkat, tahun_pelajaran } = req.body;

    if (!nama_rombel || !tingkat || !tahun_pelajaran) {
      return res.status(400).json({
        success: false,
        message: 'nama_rombel, tingkat, dan tahun_pelajaran wajib diisi!'
      });
    }

    const result = await db.query(
      `INSERT INTO rombels (nama_rombel, tingkat, tahun_pelajaran) 
       VALUES ($1, $2, $3) RETURNING *`,
      [nama_rombel, tingkat, tahun_pelajaran]
    );

    res.status(201).json({
      success: true,
      message: 'Rombel berhasil ditambahkan!',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllRombels,
  createRombel
};