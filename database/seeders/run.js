const db = require('../../src/config/db');
const bcrypt = require('bcryptjs');

const seed = async () => {
  console.log('[SEEDER] Starting data seeding...');
  try {
    // 1. Seed Users
    const adminPass = await bcrypt.hash('admin123', 10);
    const petugasPass = await bcrypt.hash('petugas123', 10);

    await db.query(`
      INSERT INTO users (nip, nama, username, password_hash, role)
      VALUES 
        ('198501012010011001', 'Administrator Sekolah', 'admin', '${adminPass}', 'ADMIN'),
        ('199002022015022002', 'Petugas Presensi', 'petugas', '${petugasPass}', 'PETUGAS')
      ON CONFLICT (username) DO NOTHING;
    `);

    // 2. Seed Settings
    await db.query(`
      INSERT INTO attendance_settings (id, jam_masuk_mulai, jam_masuk_selesai, jam_pulang_mulai, jam_pulang_selesai)
      VALUES (1, '06:00:00', '08:00:00', '12:00:00', '16:00:00')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Seed Rombels
    const rombelRes = await db.query(`
      INSERT INTO rombels (nama_rombel, tingkat, tahun_pelajaran)
      VALUES 
        ('VII-A', '7', '2025/2026'),
        ('VIII-A', '8', '2025/2026')
      RETURNING id;
    `);

    const rombelId = rombelRes.rows[0]?.id || 1;

    // 4. Seed Sample Students
    await db.query(`
      INSERT INTO students (nis, nisn, nama, jenis_kelamin, tanggal_lahir, rombel_id, qr_code)
      VALUES 
        ('2425001', '0081234561', 'Ahmad Fauzan', 'L', '2010-05-12', ${rombelId}, 'STUDENT_ID:1'),
        ('2425002', '0081234562', 'Siti Aminah', 'P', '2010-08-20', ${rombelId}, 'STUDENT_ID:2')
      ON CONFLICT (nis) DO NOTHING;
    `);

    console.log('[SEEDER] Data seeded successfully!');
    console.log('----------------------------------------------------');
    console.log('Default Accounts:');
    console.log('1. Admin   => Username: admin   | Password: admin123');
    console.log('2. Petugas => Username: petugas | Password: petugas123');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('[SEEDER ERROR]', err.message);
  } finally {
    process.exit();
  }
};

seed();