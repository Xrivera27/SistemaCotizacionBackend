// routes/cotizacionesVendedor.js
const express = require('express');
const router = express.Router();
const cotizacionesController = require('../controllers/cotizacionesController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authorization'); // ✅ Ahora sí existen
const { validate, schemas } = require('../middlewares/validation');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// POST /api/cotizaciones-vendedor - Crear nueva cotización
router.post('/', 
  authorizeRoles(['admin', 'vendedor', 'super_usuario']),
  validate(schemas.createCotizacionVendedor),
  cotizacionesController.createCotizacion
);

// GET /api/cotizaciones-vendedor - Obtener MIS cotizaciones
router.get('/', 
  authorizeRoles(['admin', 'vendedor', 'super_usuario']),
  cotizacionesController.getCotizaciones
);

// GET /api/cotizaciones-vendedor/estadisticas - Obtener MIS estadísticas
router.get('/estadisticas', 
  authorizeRoles(['admin', 'vendedor', 'super_usuario']),
  cotizacionesController.getEstadisticas
);

// GET /api/cotizaciones-vendedor/:id - Obtener MI cotización por ID
router.get('/:id', 
  authorizeRoles(['admin', 'vendedor', 'super_usuario']),
  cotizacionesController.getCotizacionById
);

// PUT /api/cotizaciones-vendedor/:id/pdf - Marcar PDF como generado
router.put('/:id/pdf', 
  authorizeRoles(['admin', 'vendedor', 'super_usuario']),
  cotizacionesController.marcarPDFGenerado
);

// POST /api/cotizaciones-vendedor/:id/duplicar - Duplicar MI cotización
router.post('/:id/duplicar', 
  authorizeRoles(['admin', 'vendedor', 'super_usuario']),
  cotizacionesController.duplicarCotizacion
);

module.exports = router;