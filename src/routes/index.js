const express = require('express');
const authRoutes = require('./auth');

const router = express.Router();

// Registrar todas las rutas
router.use('/auth', authRoutes);

// Ruta de salud del API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;