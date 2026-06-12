const db = require('../config/db');

// GET /api/products
exports.getAll = async (req, res) => {
  try {
    const { search, category_id, low_stock, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE p.is_active = 1';
    const params = [];
    if (search) {
      where += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (category_id) { where += ' AND p.category_id = ?'; params.push(category_id); }
    if (low_stock === 'true') { where += ' AND p.current_stock <= p.min_stock_alert'; }

    const [rows] = await db.query(
      `SELECT p.*, c.name as category_name, s.name as supplier_name
       FROM products p 
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       ${where} ORDER BY p.name ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM products p ${where}`, params
    );
    res.json({ success: true, data: rows, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/:id
exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.name as category_name, s.name as supplier_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id 
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found.' });
    const [movements] = await db.query(
      'SELECT sm.*, u.name as user_name FROM stock_movements sm LEFT JOIN users u ON u.id = sm.created_by WHERE sm.product_id = ? ORDER BY sm.created_at DESC LIMIT 20',
      [req.params.id]
    );
    res.json({ success: true, data: { ...rows[0], movements } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/products
exports.create = async (req, res) => {
  try {
    const { sku, name, category_id, supplier_id, brand, model, description, unit_cost, selling_price, current_stock, min_stock_alert, warranty_months } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Product name is required.' });
    const [result] = await db.query(
      'INSERT INTO products (sku,name,category_id,supplier_id,brand,model,description,unit_cost,selling_price,current_stock,min_stock_alert,warranty_months) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [sku, name, category_id, supplier_id || null, brand, model, description, unit_cost || 0, selling_price || 0, current_stock || 0, min_stock_alert || 5, warranty_months || 12]
    );
    if (current_stock > 0) {
      await db.query('INSERT INTO stock_movements (product_id,movement_type,quantity,reference,created_by) VALUES (?,?,?,?,?)',
        [result.insertId, 'in', current_stock, 'Initial Stock', req.user.id]);
    }
    const [newRow] = await db.query('SELECT p.*, c.name as category_name, s.name as supplier_name FROM products p LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newRow[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/products/:id
exports.update = async (req, res) => {
  try {
    const { sku, name, category_id, supplier_id, brand, model, description, unit_cost, selling_price, min_stock_alert, warranty_months, is_active } = req.body;
    await db.query(
      'UPDATE products SET sku=?,name=?,category_id=?,supplier_id=?,brand=?,model=?,description=?,unit_cost=?,selling_price=?,min_stock_alert=?,warranty_months=?,is_active=? WHERE id=?',
      [sku, name, category_id, supplier_id || null, brand, model, description, unit_cost, selling_price, min_stock_alert, warranty_months, is_active ?? 1, req.params.id]
    );
    const [rows] = await db.query('SELECT p.*, c.name as category_name, s.name as supplier_name FROM products p LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/products/:id/stock — add/adjust stock
exports.adjustStock = async (req, res) => {
  try {
    const { movement_type, quantity, reference, notes } = req.body;
    if (!quantity || quantity <= 0) return res.status(400).json({ success: false, message: 'Quantity must be positive.' });
    const [prod] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!prod.length) return res.status(404).json({ success: false, message: 'Product not found.' });
    let newStock = prod[0].current_stock;
    if (movement_type === 'in') newStock += quantity;
    else if (movement_type === 'out') newStock -= quantity;
    else newStock = quantity;
    if (newStock < 0) return res.status(400).json({ success: false, message: 'Stock cannot go below zero.' });
    await db.query('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, req.params.id]);
    await db.query('INSERT INTO stock_movements (product_id,movement_type,quantity,reference,notes,created_by) VALUES (?,?,?,?,?,?)',
      [req.params.id, movement_type, quantity, reference, notes, req.user.id]);
    res.json({ success: true, data: { current_stock: newStock } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/categories
exports.getCategories = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/categories
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const [result] = await db.query('INSERT INTO categories (name,description) VALUES (?,?)', [name, description]);
    const [row] = await db.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: row[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
