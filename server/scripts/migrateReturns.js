const db = require('../src/config/db');

async function migrate() {
  try {
    console.log('Starting returns migration...');

    // 1. Add returned_quantity to invoice_items
    try {
      await db.query('ALTER TABLE invoice_items ADD COLUMN returned_quantity INT DEFAULT 0');
      console.log('✅ Added returned_quantity to invoice_items');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ returned_quantity already exists');
      } else {
        throw err;
      }
    }

    // 2. Create returns table
    await db.query(`
      CREATE TABLE IF NOT EXISTS returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_number VARCHAR(50) UNIQUE,
        invoice_id INT,
        return_date DATE,
        total_refund_amount DECIMAL(10,2) DEFAULT 0.00,
        reason VARCHAR(255),
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created returns table');

    // 3. Create return_items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS return_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_id INT,
        invoice_item_id INT,
        product_id INT,
        quantity INT,
        refund_amount DECIMAL(10,2) DEFAULT 0.00
      )
    `);
    console.log('✅ Created return_items table');

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
