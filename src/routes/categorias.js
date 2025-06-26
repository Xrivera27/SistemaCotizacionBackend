const express = require('express');
const { validate, schemas } = require('../middlewares/validation');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin, requireAdminOrSuper } = require('../middlewares/authorization');
const categoriaController = require('../controllers/categoriaController');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Rutas públicas para todos los usuarios autenticados
router.get('/search', categoriaController.searchCategorias);
router.get('/activas', categoriaController.getCategoriasActivas);
router.get('/', categoriaController.getCategorias);
router.get('/:id', categoriaController.getCategoriaById);

// Rutas que requieren permisos de admin o super usuario
router.post('/', requireAdminOrSuper, validate(schemas.createCategory), categoriaController.createCategoria);
router.put('/:id', requireAdminOrSuper, validate(schemas.updateCategory), categoriaController.updateCategoria);

// Rutas que requieren permisos especiales (solo admins)
router.get('/admin/estadisticas', requireAdmin, categoriaController.getEstadisticas);
router.delete('/:id', requireAdmin, categoriaController.deleteCategoria); // Soft delete
router.patch('/:id/restore', requireAdmin, categoriaController.restoreCategoria); // Restaurar

module.exports = router; 