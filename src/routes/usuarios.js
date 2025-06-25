const express = require('express');
const { validate, schemas } = require('../middlewares/validation');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin, requireAdminOrSuper, requireOwnerOrAdmin } = require('../middlewares/authorization');
const usuarioController = require('../controllers/usuarioController');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Rutas que requieren permisos de administrador
router.get('/', requireAdminOrSuper, usuarioController.getUsuarios);
router.get('/estadisticas', requireAdminOrSuper, usuarioController.getEstadisticas);
router.post('/', requireAdmin, validate(schemas.createUsuario), usuarioController.createUsuario);
router.delete('/:id', requireAdmin, usuarioController.deleteUsuario);
router.patch('/:id/restore', requireAdmin, usuarioController.restoreUsuario);

// Rutas que pueden usar admins o el propio usuario
router.get('/:id', requireOwnerOrAdmin, usuarioController.getUsuarioById);
router.put('/:id', requireOwnerOrAdmin, validate(schemas.updateUsuario), usuarioController.updateUsuario);
router.patch('/:id/change-password', requireOwnerOrAdmin, validate(schemas.changePassword), usuarioController.changePassword);

module.exports = router;