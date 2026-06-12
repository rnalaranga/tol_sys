require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authMiddleware = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const invoiceCtrl = require('./src/controllers/invoiceController');

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/customers', authMiddleware, require('./src/routes/customers'));
app.use('/api/products', authMiddleware, require('./src/routes/products'));
app.use('/api/invoices', authMiddleware, require('./src/routes/invoices'));
app.post('/api/payments', authMiddleware, invoiceCtrl.recordPayment);
app.use('/api/analytics', authMiddleware, require('./src/routes/analytics'));
app.use('/api/warranties', authMiddleware, require('./src/routes/warranties'));
app.use('/api/suppliers', authMiddleware, require('./src/routes/suppliers'));
app.use('/api/grn', authMiddleware, require('./src/routes/grn'));
app.use('/api/installments', authMiddleware, require('./src/routes/installments'));
app.use('/api/sales_persons', authMiddleware, require('./src/routes/sales_persons'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`🚀 TOL-CPD Server running on http://localhost:${PORT}`);
});

module.exports = app;
