const db = require('../config/db');

// GET /api/analytics/dashboard — summary cards
exports.getDashboard = async (req, res) => {
  try {
    const [[revenue]] = await db.query(`SELECT COALESCE(SUM(total_amount),0) as total_revenue, COUNT(*) as total_invoices FROM invoices WHERE status != 'cancelled'`);
    const [[outstanding]] = await db.query(`SELECT COALESCE(SUM(balance_amount),0) as total_outstanding FROM invoices WHERE status IN ('active','overdue')`);
    const [[overdue]] = await db.query(`SELECT COUNT(DISTINCT invoice_id) as overdue_invoices FROM installments WHERE status='overdue'`);
    const [[customers]] = await db.query(`SELECT COUNT(*) as total_customers FROM customers WHERE is_active=1`);
    const [[products]] = await db.query(`SELECT COUNT(*) as total_products, SUM(CASE WHEN current_stock <= min_stock_alert THEN 1 ELSE 0 END) as low_stock FROM products WHERE is_active=1`);
    const [[monthRevenue]] = await db.query(`SELECT COALESCE(SUM(total_amount),0) as month_revenue FROM invoices WHERE MONTH(invoice_date)=MONTH(NOW()) AND YEAR(invoice_date)=YEAR(NOW()) AND status!='cancelled'`);
    const [[monthCollected]] = await db.query(`SELECT COALESCE(SUM(amount),0) as month_collected FROM payments WHERE MONTH(payment_date)=MONTH(NOW()) AND YEAR(payment_date)=YEAR(NOW())`);

    res.json({
      success: true,
      data: {
        total_revenue: revenue.total_revenue,
        total_invoices: revenue.total_invoices,
        total_outstanding: outstanding.total_outstanding,
        overdue_invoices: overdue.overdue_invoices,
        total_customers: customers.total_customers,
        total_products: products.total_products,
        low_stock_products: products.low_stock,
        month_revenue: monthRevenue.month_revenue,
        month_collected: monthCollected.month_collected,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/analytics/revenue — monthly revenue chart
exports.getRevenueTrend = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const [rows] = await db.query(
      `SELECT MONTH(invoice_date) as month, 
        COALESCE(SUM(total_amount),0) as revenue,
        COALESCE(SUM(paid_amount),0) as collected,
        COUNT(*) as invoice_count
       FROM invoices
       WHERE YEAR(invoice_date) = ? AND status != 'cancelled'
       GROUP BY MONTH(invoice_date)
       ORDER BY month ASC`,
      [year]
    );
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const result = months.map((name, idx) => {
      const found = rows.find(r => r.month === idx + 1);
      return { month: name, revenue: found ? found.revenue : 0, collected: found ? found.collected : 0, invoice_count: found ? found.invoice_count : 0 };
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/analytics/products/movement — item movement
exports.getProductMovement = async (req, res) => {
  try {
    const { period = '30', limit = 10 } = req.query;
    const [topSelling] = await db.query(
      `SELECT p.id, p.name, p.sku, p.brand, c.name as category,
        SUM(ii.quantity) as units_sold,
        SUM(ii.total_price) as revenue,
        p.current_stock
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id AND i.status != 'cancelled' AND i.invoice_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
       JOIN products p ON p.id = ii.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       GROUP BY p.id
       ORDER BY units_sold DESC
       LIMIT ?`,
      [parseInt(period), parseInt(limit)]
    );

    const [categoryBreakdown] = await db.query(
      `SELECT c.name as category, SUM(ii.quantity) as units_sold, SUM(ii.total_price) as revenue
       FROM invoice_items ii
       JOIN invoices i ON i.id=ii.invoice_id AND i.status!='cancelled' AND i.invoice_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
       JOIN products p ON p.id=ii.product_id
       JOIN categories c ON c.id=p.category_id
       GROUP BY c.id ORDER BY revenue DESC`,
      [parseInt(period)]
    );

    const [slowMoving] = await db.query(
      `SELECT p.id, p.name, p.sku, p.brand, p.current_stock,
        COALESCE(SUM(ii.quantity),0) as units_sold
       FROM products p
       LEFT JOIN invoice_items ii ON ii.product_id=p.id
       LEFT JOIN invoices i ON i.id=ii.invoice_id AND i.status!='cancelled' AND i.invoice_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
       WHERE p.is_active=1 AND p.current_stock > 0
       GROUP BY p.id
       ORDER BY units_sold ASC, p.current_stock DESC
       LIMIT 10`,
      [parseInt(period)]
    );

    res.json({ success: true, data: { topSelling, categoryBreakdown, slowMoving } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/analytics/advanced — brand sales, supplier volume, profit margin
exports.getAdvanced = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    
    const [brandBreakdown] = await db.query(
      `SELECT p.brand, SUM(ii.quantity) as units_sold, SUM(ii.total_price) as revenue
       FROM invoice_items ii
       JOIN invoices i ON i.id=ii.invoice_id AND i.status!='cancelled' AND i.invoice_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
       JOIN products p ON p.id=ii.product_id
       WHERE p.brand IS NOT NULL AND p.brand != ''
       GROUP BY p.brand ORDER BY revenue DESC`,
      [parseInt(period)]
    );

    const [supplierVolume] = await db.query(
      `SELECT s.name as supplier, COUNT(DISTINCT g.id) as grn_count, COALESCE(SUM(gi.quantity * gi.unit_cost), 0) as total_volume
       FROM suppliers s
       JOIN grn g ON g.supplier_id=s.id AND g.grn_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
       JOIN grn_items gi ON gi.grn_id=g.id
       GROUP BY s.id ORDER BY total_volume DESC`,
      [parseInt(period)]
    );

    const [profitTrendRaw] = await db.query(
      `SELECT MONTH(i.invoice_date) as month, 
        SUM(ii.total_price) as revenue,
        SUM(ii.quantity * p.unit_cost) as cost
       FROM invoice_items ii
       JOIN invoices i ON i.id=ii.invoice_id AND i.status != 'cancelled' AND YEAR(i.invoice_date) = YEAR(NOW())
       JOIN products p ON p.id=ii.product_id
       GROUP BY MONTH(i.invoice_date)
       ORDER BY month ASC`
    );

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const profitTrend = months.map((name, idx) => {
      const found = profitTrendRaw.find(r => r.month === idx + 1);
      const revenue = found ? parseFloat(found.revenue) : 0;
      const cost = found ? parseFloat(found.cost) : 0;
      return { month: name, revenue, cost, profit: revenue - cost };
    });

    res.json({ success: true, data: { brandBreakdown, supplierVolume, profitTrend } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/analytics/receivables — aging report
exports.getReceivables = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        SUM(CASE WHEN DATEDIFF(NOW(), inst.due_date) <= 0 THEN inst.amount_due - inst.amount_paid ELSE 0 END) as current_due,
        SUM(CASE WHEN DATEDIFF(NOW(), inst.due_date) BETWEEN 1 AND 30 THEN inst.amount_due - inst.amount_paid ELSE 0 END) as overdue_30,
        SUM(CASE WHEN DATEDIFF(NOW(), inst.due_date) BETWEEN 31 AND 60 THEN inst.amount_due - inst.amount_paid ELSE 0 END) as overdue_60,
        SUM(CASE WHEN DATEDIFF(NOW(), inst.due_date) BETWEEN 61 AND 90 THEN inst.amount_due - inst.amount_paid ELSE 0 END) as overdue_90,
        SUM(CASE WHEN DATEDIFF(NOW(), inst.due_date) > 90 THEN inst.amount_due - inst.amount_paid ELSE 0 END) as overdue_90plus
       FROM installments inst
       JOIN invoices i ON i.id=inst.invoice_id AND i.status NOT IN ('completed','cancelled')
       WHERE inst.status IN ('pending','partial','overdue')`
    );

    const [recentPayments] = await db.query(
      `SELECT p.*, i.invoice_number, c.name as customer_name
       FROM payments p
       JOIN invoices i ON i.id=p.invoice_id
       JOIN customers c ON c.id=i.customer_id
       ORDER BY p.payment_date DESC LIMIT 10`
    );

    res.json({ success: true, data: { aging: rows[0], recentPayments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/analytics/warranty/expiring
exports.getWarrantyExpiring = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const [rows] = await db.query(
      `SELECT w.*, p.name as product_name, p.sku, p.brand, c.name as customer_name, c.phone as customer_phone,
        i.invoice_number, DATEDIFF(w.end_date, NOW()) as days_remaining
       FROM warranties w
       JOIN products p ON p.id=w.product_id
       JOIN customers c ON c.id=w.customer_id
       JOIN invoices i ON i.id=w.invoice_id
       WHERE w.status='active' AND w.end_date <= DATE_ADD(NOW(), INTERVAL ? DAY) AND w.end_date >= NOW()
       ORDER BY w.end_date ASC`,
      [parseInt(days)]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/warranties
exports.getWarranties = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND w.status=?'; params.push(status); }
    if (search) {
      where += ' AND (c.name LIKE ? OR p.name LIKE ? OR i.invoice_number LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    const [rows] = await db.query(
      `SELECT w.*, p.name as product_name, p.sku, p.brand, c.name as customer_name, c.phone as customer_phone,
        i.invoice_number, DATEDIFF(w.end_date, NOW()) as days_remaining
       FROM warranties w
       JOIN products p ON p.id=w.product_id
       JOIN customers c ON c.id=w.customer_id
       JOIN invoices i ON i.id=w.invoice_id
       ${where} ORDER BY w.end_date ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM warranties w JOIN products p ON p.id=w.product_id JOIN customers c ON c.id=w.customer_id JOIN invoices i ON i.id=w.invoice_id ${where}`,
      params
    );
    res.json({ success: true, data: rows, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/warranty-claims
exports.createWarrantyClaim = async (req, res) => {
  try {
    const { warranty_id, claim_date, description } = req.body;
    const [result] = await db.query(
      'INSERT INTO warranty_claims (warranty_id,claim_date,description,created_by) VALUES (?,?,?,?)',
      [warranty_id, claim_date, description, req.user.id]
    );
    await db.query("UPDATE warranties SET status='claimed' WHERE id=?", [warranty_id]);
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
