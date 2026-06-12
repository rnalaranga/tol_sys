const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'tol_cpd',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Creating sales_targets table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_targets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sales_person_id INT NOT NULL,
        product_id INT NOT NULL,
        target_month VARCHAR(7) NOT NULL, -- e.g. "2026-06"
        target_quantity INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_target (sales_person_id, product_id, target_month),
        FOREIGN KEY (sales_person_id) REFERENCES sales_persons(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    console.log('Database updated successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
