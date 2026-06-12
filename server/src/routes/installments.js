const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/installmentController');

router.get('/summary', ctrl.getSummary);
router.get('/', ctrl.getAll);

module.exports = router;
