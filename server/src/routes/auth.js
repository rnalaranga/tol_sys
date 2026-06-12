const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/login', auth.login);
router.get('/me', authMiddleware, auth.me);

module.exports = router;
