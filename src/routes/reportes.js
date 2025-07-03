const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const { authenticateToken, requireAdmin, requireAdminOrSuper } = require('../middlewares/authorization');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// ===== RUTAS DE CONFIGURACIÓN =====

// Obtener tipos de reporte disponibles
router.get('/tipos', requireAdminOrSuper, reportesController.getTiposReporte);

// Obtener opciones para filtros (vendedores, servicios, clientes)
router.get('/opciones', requireAdminOrSuper, reportesController.getOpcionesReporte);

// ===== RUTAS DE GENERACIÓN DE REPORTES =====

// Generar reporte general (dispatcher)
router.post('/generar', requireAdminOrSuper, reportesController.generarReporte);

// Exportar reporte
router.post('/exportar', requireAdminOrSuper, reportesController.exportarReporte);

// ===== RUTAS ESPECÍFICAS POR TIPO DE REPORTE =====

// Reporte de cotizaciones
router.get('/cotizaciones', requireAdminOrSuper, reportesController.getReporteCotizaciones);

// Reporte de vendedores
router.get('/vendedores', requireAdminOrSuper, reportesController.getReporteVendedores);

// Reporte de servicios
router.get('/servicios', requireAdminOrSuper, reportesController.getReporteServicios);

// Reporte de clientes
router.get('/clientes', requireAdminOrSuper, reportesController.getReporteClientes);

// Reporte financiero
router.get('/financiero', requireAdminOrSuper, reportesController.getReporteFinanciero);

// Agregar esta línea:
router.post('/generar-pdf', requireAdminOrSuper, reportesController.generarPDF);

// ===== RUTAS FUTURAS PARA REPORTES AVANZADOS =====

// TODO: Reporte comparativo entre períodos
// router.get('/comparativo', requireAdminOrSuper, reportesController.getReporteComparativo);

// TODO: Reporte de tendencias
// router.get('/tendencias', requireAdminOrSuper, reportesController.getReporteTendencias);

// TODO: Reporte de objetivos vs resultados
// router.get('/objetivos', requireAdminOrSuper, reportesController.getReporteObjetivos);

module.exports = router;