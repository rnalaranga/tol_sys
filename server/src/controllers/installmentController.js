const pool = require('../config/db');

// GET /api/installments
const getAll = async (req, res) => {
  try {
    const {
      status, frequency, customer_id, startDate, endDate, sales_person_id, search,
      page = 1, limit = 50
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Auto-mark overdue: pending/partial installments past due_date
    await pool.query(
      `UPDATE installments
       SET status = 'overdue'
       WHERE status IN ('pending', 'partial')
         AND due_date < CURDATE()`
    );

    let whereClauses = [];
    const params = [];

    if (status) {
      whereClauses.push('inst.status = ?');
      params.push(status);
    }
    if (frequency) {
      whereClauses.push('i.installment_frequency = ?');
      params.push(frequency);
    }
    if (customer_id) {
      whereClauses.push('i.customer_id = ?');
      params.push(customer_id);
    }
    if (search) {
      whereClauses.push('(c.name LIKE ? OR i.invoice_number LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like);
    }
    if (sales_person_id) {
      whereClauses.push('i.sales_person_id = ?');
      params.push(sales_person_id);
    }
    if (startDate) {
      whereClauses.push('inst.due_date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push('inst.due_date <= ?');
      params.push(endDate);
    }

    const where = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countSql = `
      SELECT COUNT(DISTINCT inst.id) as total
      FROM installments inst
      LEFT JOIN invoices i ON i.id = inst.invoice_id
      LEFT JOIN customers c ON c.id = i.customer_id
      ${where}
    `;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `
      SELECT
        inst.*,
        i.invoice_number,
        i.installment_frequency,
        i.installment_months,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.customer_code,
        sp.name AS sales_person_name
      FROM installments inst
      LEFT JOIN invoices i ON i.id = inst.invoice_id
      LEFT JOIN customers c ON c.id = i.customer_id
      LEFT JOIN sales_persons sp ON sp.id = i.sales_person_id
      ${where}
      ORDER BY inst.due_date ASC
      LIMIT ? OFFSET ?
    `;
    const [data] = await pool.query(dataSql, [...params, parseInt(limit), offset]);

    return res.json({ success: true, data, total });
  } catch (err) {
    console.error('getAll installments error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// GET /api/installments/summary
const getSummary = async (req, res) => {
  try {
    // Auto-mark overdue before summary
    await pool.query(
      `UPDATE installments
       SET status = 'overdue'
       WHERE status IN ('pending', 'partial')
         AND due_date < CURDATE()`
    );

    const [[summary]] = await pool.query(
      `SELECT
         COUNT(CASE WHEN status = 'pending' THEN 1 END)  AS total_pending,
         COUNT(CASE WHEN status = 'overdue' THEN 1 END)  AS total_overdue,
         COUNT(CASE WHEN status = 'paid'    THEN 1 END)  AS total_paid,
         COUNT(CASE WHEN status = 'partial' THEN 1 END)  AS total_partial,
         COALESCE(SUM(CASE WHEN status = 'overdue' THEN (amount_due - amount_paid) ELSE 0 END), 0) AS amount_overdue,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN (amount_due - amount_paid) ELSE 0 END), 0) AS amount_pending
       FROM installments`
    );

    return res.json({ success: true, data: summary });
  } catch (err) {
    console.error('getSummary installments error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = { getAll, getSummary };
