const db = require('../src/config/db');

async function migrate() {
  try {
    await db.query(`ALTER TABLE customers CHANGE is_blacklisted risk_status TINYINT(1) DEFAULT 0;`);
    console.log("Renamed is_blacklisted to risk_status.");
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      console.log("Column might already be renamed.");
    } else {
      console.error(err);
    }
  } finally {
    process.exit();
  }
}

migrate();
