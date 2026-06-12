const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoiceController');

router.get('/overdue', ctrl.getOverdue);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);

// Payments
router.post('/payments/record', ctrl.recordPayment);

// Actions
router.post('/:id/cancel', ctrl.cancelInvoice);
router.post('/:id/returns', ctrl.processReturn);
router.get('/:id/returns', ctrl.getReturns);
router.delete('/:id', ctrl.deleteInvoice);

module.exports = router;
