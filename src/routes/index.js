const express = require('express');
const authRoutes = require('./auth');
const usuariosRoutes = require('./usuarios');
const clientesRoutes = require('./clientes'); 
const categoriasRoutes = require('./categorias'); 
const serviciosRoutes = require('./servicios');
const cotizacionesRoutes = require('./cotizaciones');
const cotizacionesVendedorRoutes = require('./cotizacionesVendedor');
const cotizacionVendedor = require('./cotizacionVendedor'); // 🆕 NUEVO
const pdfRoutes = require('./pdf');
const configuracionRoutes = require('./configuracion');
const dashboardRoutes = require('./dashboard'); 
const reportesRoutes = require('./reportes'); 

const router = express.Router();

// Registrar todas las rutas
router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/clientes', clientesRoutes); 
router.use('/categorias', categoriasRoutes); 
router.use('/servicios', serviciosRoutes);
router.use('/cotizaciones', cotizacionesRoutes);
router.use('/cotizaciones-vendedor', cotizacionesVendedorRoutes); 
router.use('/cotizacion-vendedor', cotizacionVendedor); // 🆕 NUEVA RUTA
router.use('/pdf', pdfRoutes); 
router.use('/configuracion', configuracionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reportes', reportesRoutes); 

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