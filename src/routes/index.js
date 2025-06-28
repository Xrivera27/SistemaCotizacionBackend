// routes/index.js (descomenta las líneas)
const express = require('express');
const authRoutes = require('./auth');
const usuariosRoutes = require('./usuarios');
const clientesRoutes = require('./clientes'); 
const categoriasRoutes = require('./categorias'); 
const serviciosRoutes = require('./servicios');
const cotizacionesRoutes = require('./cotizaciones');
const cotizacionesVendedorRoutes = require('./cotizacionesVendedor'); // Descomentar
const pdfRoutes = require('./pdf'); // Descomentar
const configuracionRoutes = require('./configuracion');

const router = express.Router();

// Registrar todas las rutas
router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/clientes', clientesRoutes); 
router.use('/categorias', categoriasRoutes); 
router.use('/servicios', serviciosRoutes);
router.use('/cotizaciones', cotizacionesRoutes);
router.use('/cotizaciones-vendedor', cotizacionesVendedorRoutes); // Descomentar
router.use('/pdf', pdfRoutes); // Descomentar
router.use('/configuracion', configuracionRoutes);

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