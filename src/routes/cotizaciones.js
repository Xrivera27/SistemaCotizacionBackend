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

// Obtener estadísticas específicas para SuperUsuario
router.get('/estadisticas/super', requireAdminOrSuper, cotizacionController.getEstadisticasSuper.bind(cotizacionController));

// Obtener cotizaciones pendientes de aprobación (prioridad para SuperUsuario)
router.get('/pendientes-aprobacion', requireAdminOrSuper, cotizacionController.getCotizacionesPendientesAprobacion.bind(cotizacionController));

// Obtener una cotización específica por ID
router.get('/:id', requireAdminOrSuper, cotizacionController.getCotizacionById.bind(cotizacionController));

// Generar PDF de una cotización (con parámetro tipo: copia/original)
router.get('/:id/pdf', requireAdminOrSuper, cotizacionController.generarPDF.bind(cotizacionController));

// =====================================================
// RUTAS DE GESTIÓN (admins Y super_usuarios)
// =====================================================

// Cambiar estado de cotización - ADMINS Y SUPER_USUARIOS
router.patch('/:id/estado', requireAdminOrSuper, cotizacionController.cambiarEstado.bind(cotizacionController));

// Aprobar cotización - ADMINS Y SUPER_USUARIOS
router.patch('/:id/aprobar', requireAdminOrSuper, (req, res) => {
  req.body.estado = 'aprobado';
  cotizacionController.cambiarEstado(req, res);
});

// Rechazar cotización - ADMINS Y SUPER_USUARIOS
router.patch('/:id/rechazar', requireAdminOrSuper, (req, res) => {
  req.body.estado = 'rechazado';
  cotizacionController.cambiarEstado(req, res);
});

// Aplicar descuento a cotización (SuperUsuario/Admin)
router.patch('/:id/aplicar-descuento', requireAdminOrSuper, cotizacionController.aplicarDescuento.bind(cotizacionController));

// 🆕 NUEVA RUTA: Aplicar meses gratis a cotización (SuperUsuario/Admin)
router.patch('/:id/aplicar-meses-gratis', requireAdminOrSuper, cotizacionController.aplicarMesesGratis.bind(cotizacionController));

// 🆕 NUEVA RUTA: Actualizar observaciones de cotización
router.patch('/:id/observaciones', requireAdminOrSuper, cotizacionController.actualizarObservaciones.bind(cotizacionController));

module.exports = router;