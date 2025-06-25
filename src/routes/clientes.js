const express = require('express');
const { validate, schemas } = require('../middlewares/validation');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin, requireAdminOrSuper } = require('../middlewares/authorization');
const clienteController = require('../controllers/clienteController');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Rutas públicas para todos los usuarios autenticados
router.get('/search', clienteController.searchClientes);
router.get('/', clienteController.getClientes);
router.get('/:id', clienteController.getClienteById);
router.post('/', validate(schemas.createClient), clienteController.createCliente);
router.put('/:id', validate(schemas.updateClient), clienteController.updateCliente);

// Rutas que requieren permisos especiales
router.get('/admin/estadisticas', requireAdminOrSuper, clienteController.getEstadisticas);
router.delete('/:id', requireAdminOrSuper, clienteController.deleteCliente);
router.patch('/:id/restore', requireAdmin, clienteController.restoreCliente);

module.exports = router;