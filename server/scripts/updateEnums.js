require('dotenv').config();
const db = require('../src/config/db');

async function update() {
  try {
    await db.query("ALTER TABLE installments MODIFY COLUMN status ENUM('pending','partial','paid','overdue','cancelled') NOT NULL DEFAULT 'pending'");
    console.log('Updated installments status enum');
    
    await db.query("ALTER TABLE invoices MODIFY COLUMN status ENUM('active','completed','overdue','cancelled','returned') NOT NULL DEFAULT 'active'");
    console.log('Updated invoices status enum');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

update();
