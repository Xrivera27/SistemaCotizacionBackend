const express = require('express');
const { validate, schemas } = require('../middlewares/validation');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin, requireAdminOrSuper } = require('../middlewares/authorization');
const CotizacionController = require('../controllers/cotizacionController');

const router = express.Router();
const cotizacionController = new CotizacionController();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// =====================================================
// RUTAS PÚBLICAS (todos los usuarios autenticados)
// =====================================================

// Obtener vendedores únicos (para filtros)
router.get('/vendedores', cotizacionController.getVendedores.bind(cotizacionController));

// =====================================================
// RUTAS DE ADMIN/SUPERVISOR (requieren permisos elevados)
// =====================================================

// Obtener todas las cotizaciones con filtros y paginación
router.get('/', requireAdminOrSuper, cotizacionController.getCotizaciones.bind(cotizacionController));

// Obtener estadísticas de cotizaciones
router.get('/estadisticas', requireAdminOrSuper, cotizacionController.getEstadisticas.bind(cotizacionController));

// Obtener una cotización específica por ID
router.get('/:id', requireAdminOrSuper, cotizacionController.getCotizacionById.bind(cotizacionController));

// Generar PDF de una cotización (con parámetro tipo: copia/original)
router.get('/:id/pdf', requireAdminOrSuper, cotizacionController.generarPDF.bind(cotizacionController));

// =====================================================
// RUTAS DE ADMINISTRACIÓN (solo admins)
// =====================================================

// Cambiar estado de cotización (aprobar, rechazar, etc.)
router.patch('/:id/estado', requireAdmin, cotizacionController.cambiarEstado.bind(cotizacionController));

module.exports = router;