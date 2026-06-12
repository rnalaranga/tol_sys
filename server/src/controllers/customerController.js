const db = require('../config/db');

// GET /api/customers
exports.getAll = async (req, res) => {
  try {
    const { search, risk_status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE c.is_active = 1';
    const params = [];
    if (search) {
      where += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.nic LIKE ? OR c.customer_code LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (risk_status !== undefined && risk_status !== '') {
      where += ' AND c.risk_status = ?';
      params.push(parseInt(risk_status));
    }
    const [rows] = await db.query(
      `SELECT c.*, 
        COUNT(DISTINCT i.id) as total_invoices,
        COALESCE(SUM(i.balance_amount),0) as outstanding_balance
       FROM customers c
       LEFT JOIN invoices i ON i.customer_id = c.id AND i.status != 'cancelled'
       ${where}
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM customers c ${where}`, params);
    
    // Fetch active installments
    if (rows.length > 0) {
      const customerIds = rows.map(c => c.id);
      const [installments] = await db.query(`
        SELECT inst.*, i.invoice_number, i.customer_id, i.total_amount, i.invoice_date, i.down_payment, i.discount, i.payment_type 
        FROM installments inst
        JOIN invoices i ON i.id = inst.invoice_id
        WHERE i.customer_id IN (?) AND inst.status IN ('pending', 'partial', 'overdue')
        ORDER BY inst.due_date ASC
      `, [customerIds]);

      const invoiceIds = [...new Set(installments.map(inst => inst.invoice_id))];
      let itemsByInvoice = {};
      if (invoiceIds.length > 0) {
        const [items] = await db.query(`
          SELECT ii.*, p.name as product_name
          FROM invoice_items ii
          JOIN products p ON p.id = ii.product_id
          WHERE ii.invoice_id IN (?)
        `, [invoiceIds]);
        items.forEach(item => {
          if (!itemsByInvoice[item.invoice_id]) itemsByInvoice[item.invoice_id] = [];
          itemsByInvoice[item.invoice_id].push(item);
        });
      }

      const instMap = {};
      installments.forEach(inst => {
        inst.items = itemsByInvoice[inst.invoice_id] || [];
        if (!instMap[inst.customer_id]) instMap[inst.customer_id] = [];
        instMap[inst.customer_id].push(inst);
      });

      rows.forEach(c => {
        c.activeInstallments = instMap[c.id] || [];
      });
    }

    res.json({ success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/customers/:id
exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Customer not found.' });
    const [invoices] = await db.query(
      `SELECT i.*, COUNT(inst.id) as installment_count,
        SUM(CASE WHEN inst.status='overdue' THEN 1 ELSE 0 END) as overdue_count
       FROM invoices i
       LEFT JOIN installments inst ON inst.invoice_id = i.id
       WHERE i.customer_id = ?
       GROUP BY i.id
       ORDER BY i.invoice_date DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: { ...rows[0], invoices } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/customers
exports.create = async (req, res) => {
  try {
    const { name, nic, phone, phone2, email, address, city, notes } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, message: 'Name and phone are required.' });
    const [[{ count }]] = await db.query('SELECT COUNT(*)+1 as count FROM customers');
    const customer_code = `CUS-${String(count).padStart(3, '0')}`;
    const [result] = await db.query(
      'INSERT INTO customers (customer_code,name,nic,phone,phone2,email,address,city,notes) VALUES (?,?,?,?,?,?,?,?,?)',
      [customer_code, name, nic, phone, phone2, email, address, city, notes]
    );
    const [newRow] = await db.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newRow[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/customers/:id
exports.update = async (req, res) => {
  try {
    const { name, nic, phone, phone2, email, address, city, notes, is_active, risk_status } = req.body;
    
    const [current] = await db.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!current.length) return res.status(404).json({ success: false, message: 'Customer not found' });
    
    const c = current[0];
    await db.query(
      'UPDATE customers SET name=?,nic=?,phone=?,phone2=?,email=?,address=?,city=?,notes=?,is_active=?,risk_status=? WHERE id=?',
      [
        name !== undefined ? name : c.name,
        nic !== undefined ? nic : c.nic,
        phone !== undefined ? phone : c.phone,
        phone2 !== undefined ? phone2 : c.phone2,
        email !== undefined ? email : c.email,
        address !== undefined ? address : c.address,
        city !== undefined ? city : c.city,
        notes !== undefined ? notes : c.notes,
        is_active !== undefined ? is_active : c.is_active,
        risk_status !== undefined ? risk_status : c.risk_status,
        req.params.id
      ]
    );
    const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/customers/:id (soft delete)
exports.remove = async (req, res) => {
  try {
    await db.query('UPDATE customers SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Customer deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
