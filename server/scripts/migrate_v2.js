const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tol_cpd',
  });

  console.log('✅ Connected. Running migrations...');
  try { await conn.query("SET SESSION sql_mode = ''"); } catch(e) {}

  // 1. Add installment_frequency to invoices
  try {
    await conn.query(`ALTER TABLE invoices ADD COLUMN installment_frequency ENUM('monthly','weekly','daily') DEFAULT 'monthly' AFTER installment_months`);
    console.log('✅ Added installment_frequency to invoices');
  } catch(e) { console.log('ℹ️  installment_frequency already exists'); }

  // 2. SUPPLIERS table
  await conn.query(`CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_code VARCHAR(20) UNIQUE,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(20),
    phone2 VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    city VARCHAR(100),
    bank_name VARCHAR(150),
    bank_account VARCHAR(50),
    notes TEXT,
    outstanding_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log('✅ suppliers table ready');

  // 3. SUPPLIER PAYMENTS table
  await conn.query(`CREATE TABLE IF NOT EXISTS supplier_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    grn_id INT DEFAULT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method ENUM('cash','bank_transfer','cheque','card') NOT NULL DEFAULT 'bank_transfer',
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log('✅ supplier_payments table ready');

  // 4. GRN table
  await conn.query(`CREATE TABLE IF NOT EXISTS grn (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grn_number VARCHAR(30) UNIQUE NOT NULL,
    supplier_id INT NOT NULL,
    grn_date DATE NOT NULL,
    invoice_number VARCHAR(100),
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM('draft','received','paid','partial') NOT NULL DEFAULT 'received',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log('✅ grn table ready');

  // 5. GRN ITEMS table
  await conn.query(`CREATE TABLE IF NOT EXISTS grn_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grn_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_cost DECIMAL(12,2) NOT NULL,
    total_cost DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (grn_id) REFERENCES grn(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log('✅ grn_items table ready');

  // Add foreign key from grn to supplier_payments
  try {
    await conn.query(`ALTER TABLE supplier_payments ADD FOREIGN KEY (grn_id) REFERENCES grn(id) ON DELETE SET NULL`);
  } catch(e) {}

  // Add indexes
  const idxs = [
    'CREATE INDEX idx_suppliers_active ON suppliers(is_active)',
    'CREATE INDEX idx_grn_supplier ON grn(supplier_id)',
    'CREATE INDEX idx_grn_date ON grn(grn_date)',
    'CREATE INDEX idx_sup_payments_supplier ON supplier_payments(supplier_id)',
  ];
  for (const idx of idxs) {
    try { await conn.query(idx); } catch(e) {}
  }

  // Sample supplier
  const [[{cnt}]] = await conn.query('SELECT COUNT(*) as cnt FROM suppliers');
  if (parseInt(cnt) === 0) {
    await conn.query(`INSERT INTO suppliers (supplier_code, name, contact_person, phone, email, city) VALUES
      ('SUP-001', 'Samsung Lanka (Pvt) Ltd', 'Rajith Perera', '0112345678', 'info@samsung.lk', 'Colombo'),
      ('SUP-002', 'LG Electronics Lanka', 'Chamari Silva', '0113456789', 'info@lg.lk', 'Colombo'),
      ('SUP-003', 'Abans Group', 'Tharaka Fernando', '0114567890', 'info@abans.lk', 'Colombo')`);
    console.log('✅ Sample suppliers inserted');
  }

  console.log('\n🎉 Migration complete!\n');
  await conn.end();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration error:', err.message);
  process.exit(1);
});
