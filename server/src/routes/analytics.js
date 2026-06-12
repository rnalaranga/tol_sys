const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');

router.get('/dashboard', ctrl.getDashboard);
router.get('/advanced', ctrl.getAdvanced);
router.get('/revenue', ctrl.getRevenueTrend);
router.get('/products/movement', ctrl.getProductMovement);
router.get('/receivables', ctrl.getReceivables);
router.get('/warranty/expiring', ctrl.getWarrantyExpiring);

module.exports = router;
