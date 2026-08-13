require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs'); // atau require('bcrypt')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function makeAdmin() {
  try {
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    // Hapus admin lama jika ada
    await pool.query("DELETE FROM users WHERE username = 'admin'");
    
    // Insert admin baru lengkap dengan kolom password & password_hash
    await pool.query(
      `INSERT INTO users (username, password, password_hash, role, status_aktif) 
       VALUES ($1, $2, $3, $4, $5)`,
      ['admin', 'admin123', passwordHash, 'admin', true]
    );

    console.log('✅ BERHASIL! Akun admin berhasil dibuat di Neon!');
    console.log('👉 Username: admin');
    console.log('👉 Password: admin123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal:', err);
    process.exit(1);
  }
}

makeAdmin();