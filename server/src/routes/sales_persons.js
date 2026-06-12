const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salesPersonController');

router.get('/', ctrl.getAll);
router.get('/:id/profile', ctrl.getProfile);
router.get('/:id/performance', ctrl.getPerformance);
router.post('/:id/targets', ctrl.setTarget);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);

module.exports = router;
