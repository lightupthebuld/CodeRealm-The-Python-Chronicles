const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'coderealm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    connection.release();
  } catch (err) {
    console.warn('⚠️  MySQL connection failed:', err.message);
    console.warn('⚠️  Running in preview mode — database features will not work.');
    console.warn('⚠️  Install MySQL and run schema.sql to enable full functionality.');
  }
}

module.exports = { pool, testConnection };
