const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('[DATABASE] PostgreSQL Connected Successfully');
});

pool.on('error', (err) => {
  console.error('[DATABASE ERROR]', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};