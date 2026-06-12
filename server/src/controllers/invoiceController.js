'use strict';
const db = require('../config/db');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate next invoice number: INV-YYYYMM-XXXX
 */
async function nextInvoiceNumber(conn) {
  const now = new Date();
  const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;
  const [[{ cnt }]] = await conn.query(
    `SELECT COUNT(*) + 1 AS cnt FROM invoices WHERE invoice_number LIKE ?`,
    [`${prefix}%`]
  );
  return `${prefix}${String(cnt).padStart(4, '0')}`;
}

/**
 * Calculate installment due dates based on frequency.
 * frequency: 'daily' | 'weekly' | 'monthly'
 */
function buildInstallmentDueDates(count, frequency, startDate) {
  const dates = [];
  const base = new Date(startDate);
  for (let i = 1; i <= count; i++) {
    const d = new Date(base);
    if (frequency === 'daily') d.setDate(base.getDate() + i);
    else if (frequency === 'weekly') d.setDate(base.getDate() + i * 7);
    else d.setMonth(base.getMonth() + i); // monthly
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ─── GET /api/invoices ────────────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const {
      search, status, customer_id, sales_person_id,
      startDate, endDate, page = 1, limit = 15
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Auto-mark overdue installments
    await db.query(
      `UPDATE installments SET status = 'overdue'
       WHERE status IN ('pending','partial') AND due_date < CURDATE()`
    );

    const wheres = ['1=1'];
    const params = [];

    if (search) {
      wheres.push('(i.invoice_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status) { wheres.push('i.status = ?'); params.push(status); }
    if (customer_id) { wheres.push('i.customer_id = ?'); params.push(parseInt(customer_id)); }
    if (sales_person_id) { wheres.push('i.sales_person_id = ?'); params.push(parseInt(sales_person_id)); }
    if (startDate) { wheres.push('i.invoice_date >= ?'); params.push(startDate); }
    if (endDate) { wheres.push('i.invoice_date <= ?'); params.push(endDate); }

    const where = wheres.join(' AND ');

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       WHERE ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT i.*,
         c.name AS customer_name, c.phone AS customer_phone, c.customer_code,
         sp.name AS sales_person_name
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       LEFT JOIN sales_persons sp ON sp.id = i.sales_person_id
       WHERE ${where}
       ORDER BY i.invoice_date DESC, i.id DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    return res.json({ success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('getAll invoices:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/invoices/overdue ────────────────────────────────────────────────

exports.getOverdue = async (req, res) => {
  try {
    // Auto-mark
    await db.query(
      `UPDATE installments SET status = 'overdue'
       WHERE status IN ('pending','partial') AND due_date < CURDATE()`
    );

    const [rows] = await db.query(
      `SELECT i.*,
         c.name AS customer_name, c.phone AS customer_phone, c.customer_code,
         COUNT(DISTINCT inst.id) AS overdue_installments,
         COALESCE(SUM(inst.amount_due - inst.amount_paid),0) AS overdue_amount
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       JOIN installments inst ON inst.invoice_id = i.id AND inst.status = 'overdue'
       WHERE i.status IN ('active','overdue')
       GROUP BY i.id
       ORDER BY overdue_amount DESC`
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getOverdue invoices:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/invoices/:id ────────────────────────────────────────────────────

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [invoices] = await db.query(
      `SELECT i.*,
         c.name AS customer_name, c.phone AS customer_phone,
         c.address AS customer_address, c.customer_code, c.nic AS customer_nic,
         sp.name AS sales_person_name
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       LEFT JOIN sales_persons sp ON sp.id = i.sales_person_id
       WHERE i.id = ?`,
      [id]
    );
    if (!invoices.length) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const [items] = await db.query(
      `SELECT ii.*, p.name AS product_name, p.brand, p.sku
       FROM invoice_items ii
       JOIN products p ON p.id = ii.product_id
       WHERE ii.invoice_id = ?`,
      [id]
    );

    const [installments] = await db.query(
      `SELECT * FROM installments WHERE invoice_id = ? ORDER BY installment_number ASC`,
      [id]
    );

    const [payments] = await db.query(
      `SELECT p.*, u.name AS recorded_by_name
       FROM payments p
       LEFT JOIN users u ON u.id = p.created_by
       WHERE p.invoice_id = ?
       ORDER BY p.payment_date DESC`,
      [id]
    );

    const [warranties] = await db.query(
      `SELECT w.*, p.name AS product_name, p.brand
       FROM warranties w
       JOIN products p ON p.id = w.product_id
       WHERE w.invoice_id = ?`,
      [id]
    );

    const invoice = { ...invoices[0], items, installments, payments, warranties };
    return res.json({ success: true, data: invoice });
  } catch (err) {
    console.error('getById invoice:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/invoices ───────────────────────────────────────────────────────

exports.create = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      customer_id, invoice_date, sales_person_id,
      payment_type = 'cash',
      installment_frequency = 'monthly',
      installment_months = 1,
      down_payment = 0,
      discount = 0,
      notes = '',
      items = []
    } = req.body;

    // Validation
    if (!customer_id) throw new Error('Customer is required.');
    if (!items || items.length === 0) throw new Error('At least one item is required.');

    // Check customer exists and is not blacklisted
    const [[customer]] = await conn.query('SELECT * FROM customers WHERE id = ? AND is_active = 1', [customer_id]);
    if (!customer) throw new Error('Customer not found or inactive.');
    if (customer.risk_status === 1) throw new Error('Cannot create invoice for a blacklisted customer.');

    // Calculate totals
    const subtotal = items.reduce((sum, it) => sum + (parseFloat(it.unit_price) * parseInt(it.quantity)), 0);
    const discountAmt = parseFloat(discount) || 0;
    const totalAmount = subtotal - discountAmt;
    const downPayAmt = parseFloat(down_payment) || 0;
    const balanceAfterDown = totalAmount - downPayAmt;

    let installmentAmtEach = 0;
    let paidAmount = 0;
    let balanceAmount = totalAmount;

    if (payment_type === 'cash') {
      // Cash = fully paid
      paidAmount = totalAmount;
      balanceAmount = 0;
    } else {
      // Installment: down payment is initial paid
      paidAmount = downPayAmt;
      balanceAmount = balanceAfterDown;
      installmentAmtEach = installment_months > 0 ? Math.ceil((balanceAfterDown / installment_months) * 100) / 100 : 0;
    }

    const invoiceNumber = await nextInvoiceNumber(conn);
    const invoiceDateVal = invoice_date || new Date().toISOString().slice(0, 10);

    // Determine status
    let status = 'active';
    if (payment_type === 'cash') status = 'completed';

    // Insert invoice
    const [invoiceResult] = await conn.query(
      `INSERT INTO invoices
         (invoice_number, customer_id, invoice_date, subtotal, discount, total_amount,
          paid_amount, balance_amount, payment_type, installment_months, installment_amount,
          installment_frequency, down_payment, status, notes, sales_person_id, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        invoiceNumber, customer_id, invoiceDateVal,
        subtotal, discountAmt, totalAmount,
        paidAmount, balanceAmount,
        payment_type,
        payment_type === 'installment' ? parseInt(installment_months) : null,
        payment_type === 'installment' ? installmentAmtEach : null,
        payment_type === 'installment' ? installment_frequency : null,
        downPayAmt,
        status, notes,
        sales_person_id || null,
        req.user ? req.user.id : null
      ]
    );
    const invoiceId = invoiceResult.insertId;

    // Insert items & update stock, create warranties
    for (const item of items) {
      const productId = parseInt(item.product_id);
      const qty = parseInt(item.quantity);
      const unitPrice = parseFloat(item.unit_price);
      const totalPrice = qty * unitPrice;

      // Get product warranty info
      const [[product]] = await conn.query(
        'SELECT * FROM products WHERE id = ? AND is_active = 1',
        [productId]
      );
      if (!product) throw new Error(`Product ID ${productId} not found.`);
      if (product.current_stock < qty) throw new Error(`Insufficient stock for ${product.name}.`);

      const warrantyMonths = product.warranty_months || 12;

      // Insert invoice item
      const [itemResult] = await conn.query(
        `INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, total_price, warranty_months)
         VALUES (?,?,?,?,?,?)`,
        [invoiceId, productId, qty, unitPrice, totalPrice, warrantyMonths]
      );

      // Deduct stock
      await conn.query(
        'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
        [qty, productId]
      );

      // Stock movement record
      await conn.query(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reference, created_by)
         VALUES (?,?,?,?,?)`,
        [productId, 'out', qty, invoiceNumber, req.user ? req.user.id : null]
      );

      // Create warranty record
      const startDate = invoiceDateVal;
      const endDateObj = new Date(startDate);
      endDateObj.setMonth(endDateObj.getMonth() + warrantyMonths);
      const endDate = endDateObj.toISOString().slice(0, 10);

      await conn.query(
        `INSERT INTO warranties (invoice_item_id, invoice_id, product_id, customer_id, start_date, end_date, warranty_months, status)
         VALUES (?,?,?,?,?,?,?,?)`,
        [itemResult.insertId, invoiceId, productId, customer_id, startDate, endDate, warrantyMonths, 'active']
      );
    }

    // For installment: create installment schedule
    if (payment_type === 'installment' && parseInt(installment_months) > 0) {
      const count = parseInt(installment_months);
      const dueDates = buildInstallmentDueDates(count, installment_frequency, invoiceDateVal);
      for (let n = 0; n < count; n++) {
        // Last installment may need adjustment for rounding
        const amtDue = n === count - 1
          ? Math.round((balanceAfterDown - installmentAmtEach * (count - 1)) * 100) / 100
          : installmentAmtEach;
        await conn.query(
          `INSERT INTO installments (invoice_id, installment_number, due_date, amount_due, amount_paid, status)
           VALUES (?,?,?,?,0,'pending')`,
          [invoiceId, n + 1, dueDates[n], amtDue > 0 ? amtDue : installmentAmtEach]
        );
      }
    }

    // If cash and downPayAmt > 0, record the payment
    if (paidAmount > 0 && payment_type === 'cash') {
      await conn.query(
        `INSERT INTO payments (invoice_id, payment_date, amount, payment_method, notes, created_by)
         VALUES (?,?,?,'cash','Cash payment on invoice creation',?)`,
        [invoiceId, invoiceDateVal, paidAmount, req.user ? req.user.id : null]
      );
    } else if (payment_type === 'installment' && downPayAmt > 0) {
      // Record down payment
      await conn.query(
        `INSERT INTO payments (invoice_id, payment_date, amount, payment_method, notes, created_by)
         VALUES (?,?,?,'cash','Down payment',?)`,
        [invoiceId, invoiceDateVal, downPayAmt, req.user ? req.user.id : null]
      );
    }

    await conn.commit();

    // Fetch the created invoice to return
    const [newInvoice] = await db.query(
      `SELECT i.*, c.name AS customer_name FROM invoices i JOIN customers c ON c.id = i.customer_id WHERE i.id = ?`,
      [invoiceId]
    );

    return res.status(201).json({ success: true, data: newInvoice[0] });
  } catch (err) {
    await conn.rollback();
    console.error('create invoice:', err);
    return res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

// ─── POST /api/payments/record  (also POST /api/payments) ────────────────────

exports.recordPayment = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      invoice_id, installment_id, payment_date, amount,
      payment_method = 'cash', reference_number, notes
    } = req.body;

    if (!invoice_id || !amount || !payment_date) {
      throw new Error('invoice_id, amount, and payment_date are required.');
    }

    const payAmt = parseFloat(amount);
    if (payAmt <= 0) throw new Error('Amount must be positive.');

    // Fetch invoice
    const [[invoice]] = await conn.query('SELECT * FROM invoices WHERE id = ?', [invoice_id]);
    if (!invoice) throw new Error('Invoice not found.');
    if (invoice.status === 'cancelled') throw new Error('Cannot record payment on a cancelled invoice.');

    // Insert payment
    await conn.query(
      `INSERT INTO payments (invoice_id, installment_id, payment_date, amount, payment_method, reference_number, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        invoice_id, installment_id || null, payment_date, payAmt,
        payment_method, reference_number || null, notes || null,
        req.user ? req.user.id : null
      ]
    );

    // Update invoice paid_amount & balance
    const newPaid = parseFloat(invoice.paid_amount) + payAmt;
    const newBalance = Math.max(0, parseFloat(invoice.total_amount) - newPaid);
    const newStatus = newBalance <= 0 ? 'completed' : invoice.status;

    await conn.query(
      'UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ?',
      [newPaid, newBalance, newStatus, invoice_id]
    );

    // If a specific installment was targeted, mark it paid/partial
    if (installment_id) {
      const [[inst]] = await conn.query('SELECT * FROM installments WHERE id = ?', [installment_id]);
      if (inst) {
        const newInstPaid = parseFloat(inst.amount_paid) + payAmt;
        let instStatus = 'partial';
        if (newInstPaid >= parseFloat(inst.amount_due)) {
          instStatus = 'paid';
        }
        await conn.query(
          'UPDATE installments SET amount_paid = ?, status = ?, paid_at = ? WHERE id = ?',
          [newInstPaid, instStatus, instStatus === 'paid' ? new Date() : null, installment_id]
        );
      }
    } else if (invoice.payment_type === 'installment') {
      // Auto-distribute payment to oldest pending/partial installments
      let remaining = payAmt;
      const [insts] = await conn.query(
        `SELECT * FROM installments WHERE invoice_id = ? AND status IN ('pending','partial','overdue') ORDER BY installment_number ASC`,
        [invoice_id]
      );
      for (const inst of insts) {
        if (remaining <= 0) break;
        const owed = parseFloat(inst.amount_due) - parseFloat(inst.amount_paid);
        const applying = Math.min(remaining, owed);
        const newInstPaid = parseFloat(inst.amount_paid) + applying;
        const instStatus = newInstPaid >= parseFloat(inst.amount_due) ? 'paid' : 'partial';
        await conn.query(
          'UPDATE installments SET amount_paid = ?, status = ?, paid_at = ? WHERE id = ?',
          [newInstPaid, instStatus, instStatus === 'paid' ? new Date() : null, inst.id]
        );
        remaining -= applying;
      }
    }

    await conn.commit();
    return res.json({ success: true, message: 'Payment recorded successfully.' });
  } catch (err) {
    await conn.rollback();
    console.error('recordPayment:', err);
    return res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

// ─── POST /api/invoices/:id/cancel ───────────────────────────────────────────

exports.cancelInvoice = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    const [[invoice]] = await conn.query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) throw new Error('Invoice not found.');
    if (invoice.status === 'cancelled') throw new Error('Invoice is already cancelled.');

    // How many units were already returned to stock (per product) for this invoice
    const [alreadyReturned] = await conn.query(
      `SELECT product_id, COALESCE(SUM(quantity), 0) AS returned_qty
       FROM stock_movements
       WHERE reference = ? AND movement_type = 'in' AND notes LIKE 'Return:%'
       GROUP BY product_id`,
      [invoice.invoice_number]
    );
    const returnedMap = {};
    for (const r of alreadyReturned) returnedMap[r.product_id] = parseInt(r.returned_qty);

    // Restore only the net unreturned quantity for each item
    const [items] = await conn.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
    for (const item of items) {
      const alreadyBack = returnedMap[item.product_id] || 0;
      const netRestore = item.quantity - alreadyBack;
      if (netRestore > 0) {
        await conn.query(
          'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
          [netRestore, item.product_id]
        );
        await conn.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, reference, notes, created_by)
           VALUES (?,?,?,?,?,?)`,
          [item.product_id, 'in', netRestore, invoice.invoice_number,
           `Invoice cancelled (${alreadyBack} already returned)`, req.user ? req.user.id : null]
        );
      }
      // If netRestore === 0, all units already came back via returns — nothing to do
    }

    // Mark warranties as claimed
    await conn.query("UPDATE warranties SET status='claimed' WHERE invoice_id=?", [id]);

    // Void pending/partial installments
    await conn.query(
      "UPDATE installments SET status='overdue' WHERE invoice_id=? AND status IN ('pending','partial')",
      [id]
    );

    await conn.query("UPDATE invoices SET status='cancelled' WHERE id=?", [id]);

    await conn.commit();
    return res.json({ success: true, message: 'Invoice cancelled successfully.' });
  } catch (err) {
    await conn.rollback();
    console.error('cancelInvoice:', err);
    return res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

// ─── DELETE /api/invoices/:id ─────────────────────────────────────────────────

exports.deleteInvoice = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    const [[invoice]] = await conn.query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) throw new Error('Invoice not found.');

    // Only allow delete if cancelled or if no payments made
    if (invoice.status !== 'cancelled' && parseFloat(invoice.paid_amount) > 0) {
      throw new Error('Cannot delete an invoice with recorded payments. Cancel it first.');
    }

    // Restore stock only for units NOT already returned
    // (for cancelled invoices this was done at cancel-time; for fresh deletes we still need it)
    if (invoice.status !== 'cancelled') {
      // How many units were already returned to stock (per product) for this invoice
      const [alreadyReturned] = await conn.query(
        `SELECT product_id, COALESCE(SUM(quantity), 0) AS returned_qty
         FROM stock_movements
         WHERE reference = ? AND movement_type = 'in' AND notes LIKE 'Return:%'
         GROUP BY product_id`,
        [invoice.invoice_number]
      );
      const returnedMap = {};
      for (const r of alreadyReturned) returnedMap[r.product_id] = parseInt(r.returned_qty);

      const [items] = await conn.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
      for (const item of items) {
        const alreadyBack = returnedMap[item.product_id] || 0;
        const netRestore = item.quantity - alreadyBack;
        if (netRestore > 0) {
          await conn.query(
            'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
            [netRestore, item.product_id]
          );
        }
      }
    }
    // If already cancelled, stock was already handled at cancel time — nothing to restore.

    // Delete will cascade: invoice_items, installments, payments, warranties (via ON DELETE CASCADE)
    await conn.query('DELETE FROM invoices WHERE id = ?', [id]);

    await conn.commit();
    return res.json({ success: true, message: 'Invoice deleted successfully.' });
  } catch (err) {
    await conn.rollback();
    console.error('deleteInvoice:', err);
    return res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

// ─── POST /api/invoices/:id/returns ──────────────────────────────────────────

exports.processReturn = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { items: returnItems = [], reason = '', refund_amount = 0 } = req.body;

    if (!returnItems.length) throw new Error('No items specified for return.');

    const [[invoice]] = await conn.query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) throw new Error('Invoice not found.');
    if (invoice.status === 'cancelled') throw new Error('Cannot process return on a cancelled invoice.');

    // Restore stock for returned items
    for (const ri of returnItems) {
      const productId = parseInt(ri.product_id);
      const qty = parseInt(ri.quantity);

      await conn.query('UPDATE products SET current_stock = current_stock + ? WHERE id = ?', [qty, productId]);
      await conn.query(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reference, notes, created_by)
         VALUES (?,?,?,?,?,?)`,
        [productId, 'in', qty, invoice.invoice_number, `Return: ${reason}`, req.user ? req.user.id : null]
      );
    }

    // Adjust invoice totals if refund
    const refund = parseFloat(refund_amount) || 0;
    if (refund > 0) {
      const newPaid = Math.max(0, parseFloat(invoice.paid_amount) - refund);
      const newTotal = Math.max(0, parseFloat(invoice.total_amount) - refund);
      const newBalance = Math.max(0, newTotal - newPaid);
      await conn.query(
        'UPDATE invoices SET total_amount=?, paid_amount=?, balance_amount=?, notes=CONCAT(IFNULL(notes,""), ?) WHERE id=?',
        [newTotal, newPaid, newBalance, `\n[Return: ${reason}]`, id]
      );
    }

    await conn.commit();
    return res.json({ success: true, message: 'Return processed successfully.' });
  } catch (err) {
    await conn.rollback();
    console.error('processReturn:', err);
    return res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

// ─── GET /api/invoices/:id/returns ───────────────────────────────────────────

exports.getReturns = async (req, res) => {
  try {
    const { id } = req.params;
    // Returns are tracked via stock movements with reference = invoice_number and movement_type = 'in'
    const [[invoice]] = await db.query('SELECT invoice_number FROM invoices WHERE id = ?', [id]);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const [returns] = await db.query(
      `SELECT sm.*, p.name AS product_name, p.sku
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       WHERE sm.reference = ? AND sm.movement_type = 'in' AND sm.notes LIKE 'Return:%'
       ORDER BY sm.created_at DESC`,
      [invoice.invoice_number]
    );

    return res.json({ success: true, data: returns });
  } catch (err) {
    console.error('getReturns:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};