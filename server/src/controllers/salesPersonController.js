const pool = require('../config/db');

// GET /api/sales_persons
exports.getAll = async (req, res) => {
  try {
    const { search, status } = req.query;
    let whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(name LIKE ? OR phone LIKE ? OR nic LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const sql = `
      SELECT sp.*, 
        COUNT(DISTINCT i.id) as total_invoices,
        COALESCE(SUM(i.total_amount), 0) as total_sales
      FROM sales_persons sp
      LEFT JOIN invoices i ON i.sales_person_id = sp.id AND i.status != 'cancelled'
      ${where}
      GROUP BY sp.id
      ORDER BY sp.name ASC
    `;
    
    const [data] = await pool.query(sql, params);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/sales_persons/:id/profile
exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const [[salesPerson]] = await pool.query('SELECT * FROM sales_persons WHERE id = ?', [id]);
    if (!salesPerson) return res.status(404).json({ success: false, message: 'Sales person not found' });

    // Aggregate stats
    const [[stats]] = await pool.query(`
      SELECT 
        COUNT(i.id) as total_invoices,
        COALESCE(SUM(i.total_amount), 0) as total_sales,
        COALESCE(SUM(i.paid_amount), 0) as total_collections,
        COALESCE(SUM(i.balance_amount), 0) as outstanding_balance
      FROM invoices i
      WHERE i.sales_person_id = ? AND i.status != 'cancelled'
    `, [id]);

    // Recent Invoices
    const [recentInvoices] = await pool.query(`
      SELECT i.id, i.invoice_number, i.invoice_date, i.total_amount, i.paid_amount, i.balance_amount, i.status, c.name as customer_name
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.sales_person_id = ?
      ORDER BY i.invoice_date DESC LIMIT 20
    `, [id]);

    res.json({ success: true, data: { salesPerson, stats, recentInvoices } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/sales_persons
exports.create = async (req, res) => {
  try {
    const { name, phone, nic, status = 'active' } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const [result] = await pool.query(
      'INSERT INTO sales_persons (name, phone, nic, status) VALUES (?, ?, ?, ?)',
      [name, phone, nic, status]
    );

    res.status(201).json({ success: true, data: { id: result.insertId, name, phone, nic, status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/sales_persons/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, nic, status } = req.body;

    await pool.query(
      'UPDATE sales_persons SET name = ?, phone = ?, nic = ?, status = ? WHERE id = ?',
      [name, phone, nic, status, id]
    );

    res.json({ success: true, message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/sales_persons/:id/performance?month=2026-06
exports.getPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query; // e.g. "2026-06"
    if (!month) return res.status(400).json({ success: false, message: 'Month is required' });

    // Get targets
    const [targets] = await pool.query(`
      SELECT st.*, p.name as product_name, p.sku 
      FROM sales_targets st
      JOIN products p ON p.id = st.product_id
      WHERE st.sales_person_id = ? AND st.target_month = ?
    `, [id, month]);

    // Get actuals
    const [actuals] = await pool.query(`
      SELECT ii.product_id, SUM(ii.quantity) as actual_quantity
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      WHERE i.sales_person_id = ? AND DATE_FORMAT(i.invoice_date, '%Y-%m') = ? AND i.status != 'cancelled'
      GROUP BY ii.product_id
    `, [id, month]);

    const actualMap = {};
    actuals.forEach(a => actualMap[a.product_id] = parseInt(a.actual_quantity));

    const performance = targets.map(t => ({
      ...t,
      actual_quantity: actualMap[t.product_id] || 0,
      progress_percentage: t.target_quantity > 0 ? Math.min(100, Math.round(((actualMap[t.product_id] || 0) / t.target_quantity) * 100)) : 0
    }));

    res.json({ success: true, data: performance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/sales_persons/:id/targets
exports.setTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, target_month, target_quantity } = req.body;
    
    if (!product_id || !target_month) return res.status(400).json({ success: false, message: 'Missing fields' });

    await pool.query(`
      INSERT INTO sales_targets (sales_person_id, product_id, target_month, target_quantity)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE target_quantity = VALUES(target_quantity)
    `, [id, product_id, target_month, target_quantity]);

    res.json({ success: true, message: 'Target saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
