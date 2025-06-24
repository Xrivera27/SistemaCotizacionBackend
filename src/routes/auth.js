const express = require('express');
const { validate, schemas } = require('../middlewares/validation');
const { authenticateToken } = require('../middlewares/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Rutas públicas
router.post('/login', validate(schemas.login), authController.login);

// Rutas protegidas
router.post('/logout', authenticateToken, authController.logout);
router.post('/logout-all', authenticateToken, authController.logoutAll);
router.get('/heartbeat', authenticateToken, authController.heartbeat);
router.get('/me', authenticateToken, authController.me);
router.get('/sessions', authenticateToken, authController.getSessions);
router.delete('/sessions/:sessionId', authenticateToken, authController.revokeSession);

module.exports = router;