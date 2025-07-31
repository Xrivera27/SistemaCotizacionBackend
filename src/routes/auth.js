const express = require('express');
const { validate, schemas } = require('../middlewares/validation');
const { authenticateToken } = require('../middlewares/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Rutas públicas
router.post('/login', validate(schemas.login), authController.login);
router.post('/forgot-password', validate(schemas.forgotPassword), authController.forgotPassword);

// Rutas protegidas
router.post('/logout', authenticateToken, authController.logout);
router.post('/logout-all', authenticateToken, authController.logoutAll);
router.get('/heartbeat', authenticateToken, authController.heartbeat);
router.get('/me', authenticateToken, authController.me);
router.get('/sessions', authenticateToken, authController.getSessions);
router.delete('/sessions/:sessionId', authenticateToken, authController.revokeSession);

// 🆕 NUEVAS RUTAS OPTIMIZADAS

// Heartbeat ligero - SIN base de datos (para uso frecuente)
router.get('/ping', authController.lightHeartbeat);

// Heartbeat completo - CON base de datos (solo cuando sea necesario)  
router.get('/heartbeat-full', authenticateToken, authController.fullHeartbeat);

// Renovar token específicamente
router.post('/renew', authenticateToken, authController.renewTokenOptimized);

module.exports = router;