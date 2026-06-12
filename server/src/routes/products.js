const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productController');

router.get('/categories', ctrl.getCategories);
router.post('/categories', ctrl.createCategory);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.post('/:id/stock', ctrl.adjustStock);

module.exports = router;
