const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');

router.get('/', ctrl.getWarranties);
router.post('/claims', ctrl.createWarrantyClaim);

module.exports = router;
