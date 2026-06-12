const db = require('../src/config/db');

async function migrate() {
  try {
    await db.query(`ALTER TABLE customers ADD COLUMN is_blacklisted BOOLEAN DEFAULT 0;`);
    console.log("Added is_blacklisted to customers.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists.");
    } else {
      console.error(err);
    }
  } finally {
    process.exit();
  }
}

migrate();
