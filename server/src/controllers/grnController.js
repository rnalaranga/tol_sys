const pool = require('../config/db');

// GET /api/grn
const getAll = async (req, res) => {
  try {
    const { search, supplier_id, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(g.grn_number LIKE ? OR g.invoice_number LIKE ? OR s.name LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (supplier_id) {
      whereClauses.push('g.supplier_id = ?');
      params.push(supplier_id);
    }
    if (status) {
      whereClauses.push('g.status = ?');
      params.push(status);
    }

    const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countSql = `
      SELECT COUNT(DISTINCT g.id) as total
      FROM grn g
      LEFT JOIN suppliers s ON s.id = g.supplier_id
      ${where}
    `;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `
      SELECT g.*, s.name AS supplier_name, s.supplier_code, s.phone AS supplier_phone
      FROM grn g
      LEFT JOIN suppliers s ON s.id = g.supplier_id
      ${where}
      ORDER BY g.grn_date DESC
      LIMIT ? OFFSET ?
    `;
    const [data] = await pool.query(dataSql, [...params, parseInt(limit), offset]);

    return res.json({ success: true, data, total });
  } catch (err) {
    console.error('getAll grn error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// GET /api/grn/:id
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[grn]] = await pool.query(
      `SELECT g.*, s.name AS supplier_name, s.supplier_code, s.phone AS supplier_phone, s.email AS supplier_email
       FROM grn g
       LEFT JOIN suppliers s ON s.id = g.supplier_id
       WHERE g.id = ?`,
      [id]
    );

    if (!grn) {
      return res.status(404).json({ success: false, message: 'GRN not found' });
    }

    const [items] = await pool.query(
      `SELECT gi.*, p.name AS product_name, p.sku
       FROM grn_items gi
       LEFT JOIN products p ON p.id = gi.product_id
       WHERE gi.grn_id = ?`,
      [id]
    );

    const [payments] = await pool.query(
      `SELECT * FROM supplier_payments WHERE grn_id = ? ORDER BY payment_date DESC`,
      [id]
    );

    return res.json({
      success: true,
      data: { ...grn, items, payments }
    });
  } catch (err) {
    console.error('getById grn error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// POST /api/grn
const create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      supplier_id, grn_date, invoice_number,
      items = [], discount = 0, notes
    } = req.body;

    if (!supplier_id || !grn_date || !items.length) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        success: false,
        message: 'supplier_id, grn_date, and at least one item are required'
      });
    }

    // Auto-generate grn_number: 'GRN-YYYY-' + padded count
    const year = new Date(grn_date).getFullYear();
    const [[{ cnt }]] = await conn.query('SELECT COUNT(*) as cnt FROM grn');
    const grn_number = `GRN-${year}-` + String(parseInt(cnt) + 1).padStart(5, '0');

    // Calculate subtotal from items
    let subtotal = 0;
    for (const item of items) {
      const qty = parseFloat(item.quantity);
      const cost = parseFloat(item.unit_cost);
      subtotal += qty * cost;
    }

    const discountAmount = parseFloat(discount) || 0;
    const total_amount = subtotal - discountAmount;
    const paid_amount = 0;
    const balance_amount = total_amount;

    // Insert GRN
    const [grnResult] = await conn.query(
      `INSERT INTO grn
        (grn_number, supplier_id, grn_date, invoice_number, subtotal, discount, total_amount, paid_amount, balance_amount, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, NOW())`,
      [grn_number, supplier_id, grn_date, invoice_number || null,
       subtotal, discountAmount, total_amount, paid_amount, balance_amount, notes || null]
    );
    const grn_id = grnResult.insertId;

    // Process each item
    for (const item of items) {
      const { product_id, quantity, unit_cost } = item;
      const qty = parseFloat(quantity);
      const cost = parseFloat(unit_cost);
      const total_cost = qty * cost;

      // Insert grn_items
      await conn.query(
        `INSERT INTO grn_items (grn_id, product_id, quantity, unit_cost, total_cost)
         VALUES (?, ?, ?, ?, ?)`,
        [grn_id, product_id, qty, cost, total_cost]
      );

      // Update product stock
      await conn.query(
        `UPDATE products SET current_stock = current_stock + ? WHERE id = ?`,
        [qty, product_id]
      );

      // Insert stock_movement
      await conn.query(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reference, notes, created_at)
         VALUES (?, 'in', ?, ?, ?, NOW())`,
        [product_id, qty, grn_number, `GRN received: ${grn_number}`]
      );
    }

    // Update supplier outstanding_balance
    await conn.query(
      `UPDATE suppliers SET outstanding_balance = outstanding_balance + ?, updated_at = NOW() WHERE id = ?`,
      [total_amount, supplier_id]
    );

    await conn.commit();
    conn.release();

    const [[newGRN]] = await pool.query(
      `SELECT g.*, s.name AS supplier_name FROM grn g LEFT JOIN suppliers s ON s.id = g.supplier_id WHERE g.id = ?`,
      [grn_id]
    );

    return res.status(201).json({ success: true, data: newGRN });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('create grn error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// GET /api/grn/stats
const getStats = async (req, res) => {
  try {
    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*) AS total_grns,
         COALESCE(SUM(total_amount), 0) AS total_value,
         COALESCE(SUM(balance_amount), 0) AS total_outstanding
       FROM grn`
    );

    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error('getStats grn error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = { getAll, getById, create, getStats };
