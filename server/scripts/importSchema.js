const mysql = require('mysql2/promise');

require('dotenv').config();

async function importSchema() {
  console.log('Connecting to MySQL...');
  
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: false,
  });

  console.log('✅ Connected to MySQL!');

  // Set session mode for MySQL 5.5 compatibility
  try { await conn.query("SET SESSION sql_mode = ''"); } catch(e) {}

  const db = process.env.DB_NAME || 'tol_cpd';

  console.log(`📥 Creating database "${db}"...`);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${db}\``);

  console.log('📥 Creating tables...');

  // MySQL 5.5 compatible: only ONE TIMESTAMP with DEFAULT CURRENT_TIMESTAMP per table
  // Use created_at as the auto-timestamp, updated_at as nullable TIMESTAMP updated by app
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','sales','cashier') NOT NULL DEFAULT 'sales',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_code VARCHAR(20) UNIQUE,
      name VARCHAR(200) NOT NULL,
      nic VARCHAR(20),
      phone VARCHAR(20) NOT NULL,
      phone2 VARCHAR(20),
      email VARCHAR(150),
      address TEXT,
      city VARCHAR(100),
      notes TEXT,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sku VARCHAR(50) UNIQUE,
      name VARCHAR(200) NOT NULL,
      category_id INT,
      brand VARCHAR(100),
      model VARCHAR(100),
      description TEXT,
      unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
      selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      current_stock INT NOT NULL DEFAULT 0,
      min_stock_alert INT NOT NULL DEFAULT 5,
      warranty_months INT NOT NULL DEFAULT 12,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS stock_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      movement_type ENUM('in','out','adjustment') NOT NULL,
      quantity INT NOT NULL,
      reference VARCHAR(100),
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_number VARCHAR(30) UNIQUE NOT NULL,
      customer_id INT NOT NULL,
      invoice_date DATE NOT NULL,
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
      discount DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_type ENUM('cash','installment') NOT NULL DEFAULT 'cash',
      installment_months INT DEFAULT NULL,
      installment_amount DECIMAL(12,2) DEFAULT NULL,
      down_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
      status ENUM('active','completed','overdue','cancelled') NOT NULL DEFAULT 'active',
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS invoice_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_price DECIMAL(12,2) NOT NULL,
      total_price DECIMAL(12,2) NOT NULL,
      warranty_months INT NOT NULL DEFAULT 12,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS installments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_id INT NOT NULL,
      installment_number INT NOT NULL,
      due_date DATE NOT NULL,
      amount_due DECIMAL(12,2) NOT NULL,
      amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
      status ENUM('pending','partial','paid','overdue') NOT NULL DEFAULT 'pending',
      paid_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_id INT NOT NULL,
      installment_id INT DEFAULT NULL,
      payment_date DATE NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      payment_method ENUM('cash','bank_transfer','card','cheque') NOT NULL DEFAULT 'cash',
      reference_number VARCHAR(100),
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
      FOREIGN KEY (installment_id) REFERENCES installments(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS warranties (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_item_id INT NOT NULL,
      invoice_id INT NOT NULL,
      product_id INT NOT NULL,
      customer_id INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      warranty_months INT NOT NULL,
      status ENUM('active','expired','claimed') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS warranty_claims (
      id INT AUTO_INCREMENT PRIMARY KEY,
      warranty_id INT NOT NULL,
      claim_date DATE NOT NULL,
      description TEXT NOT NULL,
      status ENUM('open','in_progress','resolved','rejected') NOT NULL DEFAULT 'open',
      resolution_notes TEXT,
      resolved_at TIMESTAMP NULL DEFAULT NULL,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (warranty_id) REFERENCES warranties(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];

  for (const sql of tables) {
    await conn.query(sql);
  }
  console.log('✅ All tables created!');

  // Indexes
  const indexes = [
    'CREATE INDEX idx_invoices_customer ON invoices(customer_id)',
    'CREATE INDEX idx_invoices_status ON invoices(status)',
    'CREATE INDEX idx_invoices_date ON invoices(invoice_date)',
    'CREATE INDEX idx_installments_invoice ON installments(invoice_id)',
    'CREATE INDEX idx_installments_due ON installments(due_date)',
    'CREATE INDEX idx_payments_invoice ON payments(invoice_id)',
    'CREATE INDEX idx_stock_product ON stock_movements(product_id)',
    'CREATE INDEX idx_warranties_end ON warranties(end_date)',
    'CREATE INDEX idx_warranties_status ON warranties(status)',
  ];
  for (const idx of indexes) {
    try { await conn.query(idx); } catch (e) { /* ignore duplicate index */ }
  }

  // Seed data
  console.log('🌱 Seeding data...');
  const [[{ cnt }]] = await conn.query('SELECT COUNT(*) as cnt FROM users');
  if (parseInt(cnt) === 0) {
    await conn.query(`INSERT INTO users (name, email, password_hash, role) VALUES
      ('System Admin', 'admin@orientlife.lk', '$2b$10$rQnXMl6FhXlkLV7Y0z9H6eWf1mhfYkMzL0RJjN1XdV5QpKJMHwCEG', 'admin'),
      ('Sales Manager', 'sales@orientlife.lk', '$2b$10$rQnXMl6FhXlkLV7Y0z9H6eWf1mhfYkMzL0RJjN1XdV5QpKJMHwCEG', 'sales')`);

    await conn.query(`INSERT INTO categories (name, description) VALUES
      ('Television', 'TV sets and accessories'),
      ('Refrigerator', 'Fridges and freezers'),
      ('Washing Machine', 'Washing and drying machines'),
      ('Air Conditioner', 'AC units and accessories'),
      ('Small Appliances', 'Fans, irons, blenders, etc.'),
      ('Mobile & Tablets', 'Smartphones and tablets'),
      ('Audio & Visual', 'Sound systems, speakers'),
      ('Kitchen Appliances', 'Microwave, cookers, etc.')`);

    await conn.query(`INSERT INTO products (sku, name, category_id, brand, model, unit_cost, selling_price, current_stock, warranty_months) VALUES
      ('TV-SAM-43', 'Samsung 43" 4K Smart TV', 1, 'Samsung', 'UA43AU7000', 65000, 89900, 12, 12),
      ('TV-LG-55', 'LG 55" OLED Smart TV', 1, 'LG', 'OLED55C1', 145000, 189000, 5, 24),
      ('RF-ABANS-310', 'Abans 310L Refrigerator', 2, 'Abans', 'AB-310D', 52000, 69900, 8, 24),
      ('RF-SINGER-420', 'Singer 420L Double Door Fridge', 2, 'Singer', 'SRF-420', 74000, 98000, 6, 24),
      ('WM-SAM-7KG', 'Samsung 7kg Front Load Washer', 3, 'Samsung', 'WW70T3000BS', 68000, 89000, 4, 24),
      ('AC-PANASONIC-12', 'Panasonic 12000BTU Inverter AC', 4, 'Panasonic', 'CS-YZ12UKH', 78000, 105000, 7, 36),
      ('AC-MIDEA-18', 'Midea 18000BTU Split AC', 4, 'Midea', 'MSAGC-18CRDN8', 58000, 78000, 9, 24),
      ('SA-JBL-BAR', 'JBL Bar 2.1 Soundbar', 7, 'JBL', 'BAR21DEEP', 32000, 42000, 15, 12),
      ('KA-PHILIPS-MX', 'Philips Mixer Grinder', 8, 'Philips', 'HL7756', 8500, 12500, 20, 12),
      ('MB-SAMSUNG-A54', 'Samsung Galaxy A54 5G', 6, 'Samsung', 'SM-A546E', 48000, 62000, 10, 12)`);

    await conn.query(`INSERT INTO customers (customer_code, name, nic, phone, email, address, city) VALUES
      ('CUS-001', 'Kamal Perera', '198812345678', '0771234567', 'kamal@email.com', '123 Galle Road', 'Colombo'),
      ('CUS-002', 'Nimal Silva', '199023456789', '0712345678', 'nimal@email.com', '45 Kandy Road', 'Kandy'),
      ('CUS-003', 'Sumedha Fernando', '198534567890', '0751234567', 'sumedha@email.com', '78 Matara Road', 'Galle')`);

    console.log('✅ Seed data inserted!');
  } else {
    console.log('ℹ️  Data already exists, skipping seed.');
  }

  console.log('\n🎉 Database setup complete!');
  console.log('   Login: admin@orientlife.lk / Admin@123\n');

  await conn.end();
  process.exit(0);
}

importSchema().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
