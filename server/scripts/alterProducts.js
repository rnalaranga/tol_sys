const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '1234',
      database: 'tol_cpd'
    });
    console.log('Connected to MySQL...');
    await conn.query('ALTER TABLE products ADD COLUMN supplier_id INT DEFAULT NULL');
    await conn.query('ALTER TABLE products ADD FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL');
    console.log('ALTER TABLE successful!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
run();
