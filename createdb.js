const { Client } = require('pg');
const config = require('./src/config');

// Ambil URL tanpa nama database "presensisiswa"
const baseUrl = config.databaseUrl.substring(0, config.databaseUrl.lastIndexOf('/'));

const client = new Client({
  connectionString: `${baseUrl}/postgres`
});

async function createDb() {
  try {
    await client.connect();
    console.log('[CREATE DB] Connecting to PostgreSQL server...');
    
    // Cek apakah db presensisiswa sudah ada
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'presensisiswa'");
    
    if (res.rowCount === 0) {
      await client.query('CREATE DATABASE presensisiswa');
      console.log('✅ DATABASE "presensisiswa" BERHASIL DIBUAT!');
    } else {
      console.log('ℹ️ Database "presensisiswa" sudah ada.');
    }
  } catch (err) {
    console.error('❌ Gagal membuat database:', err.message);
  } finally {
    await client.end();
  }
}

createDb();