const pool = require('../config/db');

// GET /api/suppliers
const getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClauses = ['s.is_active = 1'];
    const params = [];

    if (search) {
      whereClauses.push('(s.name LIKE ? OR s.phone LIKE ? OR s.supplier_code LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countSql = `SELECT COUNT(DISTINCT s.id) as total FROM suppliers s ${where}`;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `
      SELECT s.*,
             COUNT(DISTINCT g.id) AS total_grns,
             COALESCE(SUM(sp.amount), 0) AS total_paid
      FROM suppliers s
      LEFT JOIN grn g ON g.supplier_id = s.id
      LEFT JOIN supplier_payments sp ON sp.supplier_id = s.id
      ${where}
      GROUP BY s.id
      ORDER BY s.name ASC
      LIMIT ? OFFSET ?
    `;
    const [data] = await pool.query(dataSql, [...params, parseInt(limit), offset]);

    // Fetch unpaid GRNs for these suppliers
    if (data.length > 0) {
      const supplierIds = data.map(s => s.id);
      const [unpaidGrns] = await pool.query(
        `SELECT id, supplier_id, grn_number, grn_date, invoice_number as supplier_invoice, total_amount, paid_amount, balance_amount, status,
          DATEDIFF(CURDATE(), grn_date) as days_overdue
         FROM grn
         WHERE supplier_id IN (?) AND balance_amount > 0
         ORDER BY grn_date ASC`,
        [supplierIds]
      );
      
      const grnMap = {};
      unpaidGrns.forEach(g => {
        if (!grnMap[g.supplier_id]) grnMap[g.supplier_id] = [];
        grnMap[g.supplier_id].push(g);
      });
      
      data.forEach(s => {
        s.unpaidGrns = grnMap[s.id] || [];
      });
    }

    return res.json({ success: true, data, total });
  } catch (err) {
    console.error('getAll suppliers error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// GET /api/suppliers/:id
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[supplier]] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const [grns] = await pool.query(
      `SELECT * FROM grn WHERE supplier_id = ? ORDER BY grn_date DESC LIMIT 10`,
      [id]
    );

    const [payments] = await pool.query(
      `SELECT sp.*, g.grn_number FROM supplier_payments sp
       LEFT JOIN grn g ON g.id = sp.grn_id
       WHERE sp.supplier_id = ?
       ORDER BY sp.payment_date DESC
       LIMIT 10`,
      [id]
    );

    const [unpaidGrns] = await pool.query(
      `SELECT id, grn_number, grn_date, invoice_number as supplier_invoice, total_amount, paid_amount, balance_amount, status,
        DATEDIFF(CURDATE(), grn_date) as days_overdue
       FROM grn
       WHERE supplier_id = ? AND balance_amount > 0
       ORDER BY grn_date ASC`,
      [id]
    );

    let aging = { current: 0, days30: 0, days60: 0, over90: 0 };
    for (const g of unpaidGrns) {
      const bal = parseFloat(g.balance_amount) || 0;
      if (g.days_overdue <= 30) aging.current += bal;
      else if (g.days_overdue <= 60) aging.days30 += bal;
      else if (g.days_overdue <= 90) aging.days60 += bal;
      else aging.over90 += bal;
    }

    return res.json({
      success: true,
      data: { ...supplier, grns, payments, unpaidGrns, aging }
    });
  } catch (err) {
    console.error('getById supplier error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// POST /api/suppliers
const create = async (req, res) => {
  try {
    const {
      name, contact_person, phone, phone2, email,
      address, city, bank_name, bank_account, notes
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    // Auto-generate supplier_code: 'SUP-' + padded count
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) as cnt FROM suppliers');
    const supplier_code = 'SUP-' + String(parseInt(cnt) + 1).padStart(4, '0');

    const [result] = await pool.query(
      `INSERT INTO suppliers
        (supplier_code, name, contact_person, phone, phone2, email, address, city, bank_name, bank_account, notes, is_active, outstanding_balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW(), NOW())`,
      [supplier_code, name, contact_person || null, phone || null, phone2 || null,
       email || null, address || null, city || null, bank_name || null,
       bank_account || null, notes || null]
    );

    const [[newSupplier]] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [result.insertId]);

    return res.status(201).json({ success: true, data: newSupplier });
  } catch (err) {
    console.error('create supplier error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// PUT /api/suppliers/:id
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, contact_person, phone, phone2, email,
      address, city, bank_name, bank_account, notes, is_active
    } = req.body;

    const [[existing]] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    await pool.query(
      `UPDATE suppliers SET
        name = ?,
        contact_person = ?,
        phone = ?,
        phone2 = ?,
        email = ?,
        address = ?,
        city = ?,
        bank_name = ?,
        bank_account = ?,
        notes = ?,
        is_active = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [
        name ?? existing.name,
        contact_person ?? existing.contact_person,
        phone ?? existing.phone,
        phone2 ?? existing.phone2,
        email ?? existing.email,
        address ?? existing.address,
        city ?? existing.city,
        bank_name ?? existing.bank_name,
        bank_account ?? existing.bank_account,
        notes ?? existing.notes,
        is_active !== undefined ? is_active : existing.is_active,
        id
      ]
    );

    const [[updated]] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [id]);

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('update supplier error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// POST /api/suppliers/payments
const recordPayment = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      supplier_id, grn_id, payment_date, amount,
      payment_method, reference_number, notes
    } = req.body;

    if (!supplier_id || !payment_date || !amount) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: 'supplier_id, payment_date, and amount are required' });
    }

    const paymentAmount = parseFloat(amount);

    // Insert payment record
    await conn.query(
      `INSERT INTO supplier_payments
        (supplier_id, grn_id, payment_date, amount, payment_method, reference_number, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [supplier_id, grn_id || null, payment_date, paymentAmount,
       payment_method || null, reference_number || null, notes || null]
    );

    // Update supplier outstanding_balance
    await conn.query(
      `UPDATE suppliers SET outstanding_balance = outstanding_balance - ?, updated_at = NOW() WHERE id = ?`,
      [paymentAmount, supplier_id]
    );

    // If grn_id provided: update grn paid_amount, balance_amount, and status
    if (grn_id) {
      const [[grn]] = await conn.query('SELECT * FROM grn WHERE id = ?', [grn_id]);
      if (grn) {
        const newPaid = parseFloat(grn.paid_amount || 0) + paymentAmount;
        const newBalance = parseFloat(grn.total_amount || 0) - newPaid;
        let status = 'partial';
        if (newBalance <= 0) {
          status = 'paid';
        }
        await conn.query(
          `UPDATE grn SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ?`,
          [newPaid, Math.max(newBalance, 0), status, grn_id]
        );
      }
    }

    await conn.commit();
    conn.release();

    return res.status(201).json({ success: true, message: 'Payment recorded successfully' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('recordPayment error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// GET /api/suppliers/payments/all
const getPayments = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let whereClauses = [];
    const params = [];
    if (startDate) { whereClauses.push('sp.payment_date >= ?'); params.push(startDate); }
    if (endDate) { whereClauses.push('sp.payment_date <= ?'); params.push(endDate); }
    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const [data] = await pool.query(
      `SELECT sp.*,
              s.name AS supplier_name,
              s.supplier_code,
              g.grn_number
       FROM supplier_payments sp
       LEFT JOIN suppliers s ON s.id = sp.supplier_id
       LEFT JOIN grn g ON g.id = sp.grn_id
       ${whereSql}
       ORDER BY sp.payment_date DESC
       LIMIT 50`, params
    );

    return res.json({ success: true, data });
  } catch (err) {
    console.error('getPayments error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = { getAll, getById, create, update, recordPayment, getPayments };
