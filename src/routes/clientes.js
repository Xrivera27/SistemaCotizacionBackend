const express = require('express');
const { validate, schemas } = require('../middlewares/validation');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin, requireAdminOrSuper } = require('../middlewares/authorization');
const clienteController = require('../controllers/clienteController');

const router = express.Router();

// ✅ APLICAR AUTENTICACIÓN A TODAS LAS RUTAS
router.use(authenticateToken);

// ✅ RUTAS PÚBLICAS PARA USUARIOS AUTENTICADOS (vendedores pueden usar estas)
router.get('/modal/search', clienteController.searchClientesModal); // ✅ NUEVO - búsqueda para modales CON filtros
router.get('/search', clienteController.searchClientes);            // ✅ Admin - búsqueda sin filtros para CRUD
router.get('/', clienteController.getClientes);                     // ✅ Vendedores ven sus clientes
router.get('/:id', clienteController.getClienteById);               // ✅ Vendedores ven sus clientes
router.post('/', validate(schemas.createClient), clienteController.createCliente);    // ✅ Vendedores pueden crear
router.put('/:id', validate(schemas.updateClient), clienteController.updateCliente);  // ✅ Vendedores pueden editar sus clientes

// ✅ RUTAS ADMINISTRATIVAS (solo admins y super usuarios)
router.get('/admin/estadisticas', requireAdminOrSuper, clienteController.getEstadisticas);
router.delete('/:id', requireAdminOrSuper, clienteController.deleteCliente);
router.patch('/:id/restore', requireAdmin, clienteController.restoreCliente);

module.exports = router;