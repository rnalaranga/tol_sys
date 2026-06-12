const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/supplierController');

router.get('/payments/all', ctrl.getPayments);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.post('/payments', ctrl.recordPayment);

module.exports = router;
