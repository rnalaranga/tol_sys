const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixPassword() {
  const password = 'Admin@123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Generated hash:', hash);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tol_cpd',
  });

  await conn.query('UPDATE users SET password_hash = ?', [hash]);
  console.log('✅ Password updated for all users!');
  console.log('   Login: admin@orientlife.lk / Admin@123');

  await conn.end();
}

fixPassword().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
