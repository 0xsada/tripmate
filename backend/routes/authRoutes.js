const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/me', authController.getMe);
router.post('/google', authController.googleLogin);
router.post('/demo', authController.demoLogin);
router.post('/logout', authController.logout);

module.exports = router;
