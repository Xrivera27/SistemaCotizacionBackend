const express = require('express');
const { validate, schemas } = require('../middlewares/validation');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin, requireAdminOrSuper } = require('../middlewares/authorization');
const servicioController = require('../controllers/servicioController');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// ==================== RUTAS ESPECÍFICAS PRIMERO ====================
// Rutas de administración (ANTES de /:id)
router.get('/admin/estadisticas', requireAdmin, servicioController.getEstadisticas);

// 🆕 NUEVAS RUTAS ADMINISTRATIVAS
router.get('/admin/stats/categories', requireAdmin, servicioController.getAdvancedCategoryStats);
router.get('/admin/validate', requireAdmin, servicioController.validateDataIntegrity);
router.post('/admin/migrate', requireAdmin, servicioController.migrateToMultipleCategories);

// Rutas de búsqueda y filtros (ANTES de /:id)
router.get('/search', servicioController.searchServicios);
router.get('/activos', servicioController.getServiciosActivos);
router.get('/categoria/:categoria_id', servicioController.getServiciosPorCategoria);

// 🆕 NUEVAS RUTAS DE CONSULTA
router.get('/expanded', servicioController.getServiciosWithExpandedCategories);
router.post('/check-conflicts', requireAdminOrSuper, servicioController.checkNameConflicts);

// ==================== RUTAS DINÁMICAS AL FINAL ====================
// 🆕 NUEVAS RUTAS CON PARÁMETROS (ANTES de /:id genérico)
router.get('/:id/categories', servicioController.getCategoriesForServicio);
router.get('/:id/related', servicioController.getRelatedServicios);

// Rutas con parámetros dinámicos van al final
router.get('/:id', servicioController.getServicioById);

// ==================== RUTAS CRUD ====================
// Rutas principales
router.get('/', servicioController.getServicios);

// Rutas que requieren permisos de admin o super usuario
router.post('/', requireAdminOrSuper, validate(schemas.createService), servicioController.createServicio);
router.put('/:id', requireAdminOrSuper, validate(schemas.updateService), servicioController.updateServicio);

// Rutas que requieren permisos especiales (solo admins)
router.delete('/:id', requireAdmin, servicioController.deleteServicio); // Soft delete
router.patch('/:id/restore', requireAdmin, servicioController.restoreServicio); // Restaurar

module.exports = router;