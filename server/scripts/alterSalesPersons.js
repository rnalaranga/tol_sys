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
    console.log('Creating sales_persons table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_persons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        nic VARCHAR(50),
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Adding sales_person_id to invoices...');
    try {
      await pool.query('ALTER TABLE invoices ADD COLUMN sales_person_id INT NULL AFTER customer_id');
      await pool.query('ALTER TABLE invoices ADD CONSTRAINT fk_sales_person FOREIGN KEY (sales_person_id) REFERENCES sales_persons(id) ON DELETE SET NULL');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('sales_person_id already exists in invoices.');
      } else {
        console.error('Error adding column to invoices:', e.message);
      }
    }

    console.log('Database updated successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
