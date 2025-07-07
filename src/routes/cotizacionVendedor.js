const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorization');
const VendedorCotizacionController = require('../controllers/VendedorCotizacionController');
const router = express.Router();
const vendedorCotizacionController = new VendedorCotizacionController();

// Middleware de autenticación y autorización para vendedores
router.use(authenticateToken);
router.use(authorizeRoles(['vendedor']));

// =====================================================
// RUTAS PARA VENDEDORES (solo sus cotizaciones)
// =====================================================

// Obtener todas las cotizaciones del vendedor con filtros y paginación
router.get('/', vendedorCotizacionController.getMisCotizaciones.bind(vendedorCotizacionController));

// Obtener estadísticas del vendedor
router.get('/estadisticas', vendedorCotizacionController.getMisEstadisticas.bind(vendedorCotizacionController));

// Obtener una cotización específica del vendedor por ID
router.get('/:id', vendedorCotizacionController.getMiCotizacionById.bind(vendedorCotizacionController));

// Generar PDF de cotización del vendedor (solo copia por defecto)
router.get('/:id/pdf', vendedorCotizacionController.generarMiPDF.bind(vendedorCotizacionController));

// Duplicar cotización del vendedor
router.post('/:id/duplicar', vendedorCotizacionController.duplicarCotizacion.bind(vendedorCotizacionController));

module.exports = router;