const db = require('../../src/config/db');

const migrate = async () => {
  console.log('[MIGRATION] Starting database migration...');
  try {
    // 1. Table users (Teachers / Staff / Admin)
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nip VARCHAR(50) UNIQUE,
        nama VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'PETUGAS')),
        status_aktif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Table rombels
    await db.query(`
      CREATE TABLE IF NOT EXISTS rombels (
        id SERIAL PRIMARY KEY,
        nama_rombel VARCHAR(50) NOT NULL,
        tingkat VARCHAR(10) NOT NULL,
        tahun_pelajaran VARCHAR(20) NOT NULL,
        status_aktif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Table students
    await db.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        nis VARCHAR(30) UNIQUE NOT NULL,
        nisn VARCHAR(30) UNIQUE NOT NULL,
        nama VARCHAR(100) NOT NULL,
        jenis_kelamin CHAR(1) CHECK (jenis_kelamin IN ('L', 'P')),
        tanggal_lahir DATE,
        rombel_id INT REFERENCES rombels(id) ON DELETE SET NULL,
        status_aktif BOOLEAN DEFAULT true,
        qr_code VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Table attendance_settings
    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance_settings (
        id SERIAL PRIMARY KEY,
        jam_masuk_mulai TIME NOT NULL,
        jam_masuk_selesai TIME NOT NULL,
        jam_pulang_mulai TIME NOT NULL,
        jam_pulang_selesai TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Table attendance
    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        siswa_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        tanggal DATE NOT NULL,
        jam TIME NOT NULL,
        tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('MASUK', 'PULANG')),
        status VARCHAR(20) NOT NULL CHECK (status IN ('HADIR', 'TERLAMBAT', 'DITOLAK')),
        keterangan TEXT,
        petugas_id INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_attendance_per_day UNIQUE (siswa_id, tanggal, tipe)
      );
    `);

    // Indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON attendance(tanggal);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_attendance_siswa ON attendance(siswa_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_students_qr ON students(qr_code);`);

    console.log('[MIGRATION] All tables created successfully!');
  } catch (err) {
    console.error('[MIGRATION ERROR]', err.message);
  } finally {
    process.exit();
  }
};

migrate();