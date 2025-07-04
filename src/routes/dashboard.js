const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const superDashboardController = require('../controllers/superDashboardController'); // NUEVO
const { 
  authenticateToken, 
  requireAdmin, 
  requireAdminOrSuper,
  authorizeRoles 
} = require('../middlewares/authorization');

// Middleware de autenticación para todas las rutas del dashboard
router.use(authenticateToken);

// === RUTAS PARA DASHBOARD ADMINISTRADOR ===
router.get('/admin/stats', requireAdmin, dashboardController.getAdminStats);
router.get('/admin/colaboradores-chart', requireAdmin, dashboardController.getColaboradoresChart);
router.get('/admin/servicios-chart', requireAdmin, dashboardController.getServiciosChart);
router.get('/admin/resumen-mensual', requireAdmin, dashboardController.getResumenMensual);
router.get('/admin/cotizaciones-recientes', requireAdmin, dashboardController.getCotizacionesRecientes);
router.get('/admin/all-data', requireAdmin, dashboardController.getAllDashboardData);

// === RUTAS PARA DASHBOARD SUPER USUARIO ===
router.get('/super-usuario/stats', 
  authorizeRoles(['super_usuario']), 
  superDashboardController.getSuperUsuarioStats
);

router.get('/super-usuario/efectivas-vs-canceladas', 
  authorizeRoles(['super_usuario']), 
  superDashboardController.getEfectivasVsCanceladas
);

router.get('/super-usuario/colaboradores-chart', 
  authorizeRoles(['super_usuario']), 
  superDashboardController.getColaboradoresChart
);

router.get('/super-usuario/servicios-chart', 
  authorizeRoles(['super_usuario']), 
  superDashboardController.getServiciosChart
);

router.get('/super-usuario/resumen-mensual', 
  authorizeRoles(['super_usuario']), 
  superDashboardController.getResumenMensual
);

router.get('/super-usuario/cotizaciones-pendientes-aprobacion', 
  authorizeRoles(['super_usuario']), 
  superDashboardController.getCotizacionesPendientesAprobacion
);

router.post('/super-usuario/aprobar-cotizacion', 
  authorizeRoles(['super_usuario']), 
  superDashboardController.aprobarCotizacion
);

router.post('/super-usuario/rechazar-cotizacion', 
  authorizeRoles(['super_usuario']), 
  superDashboardController.rechazarCotizacion
);

router.get('/super-usuario/all-data', 
  authorizeRoles(['super_usuario']), 
  superDashboardController.getAllDashboardData
);

// === RUTAS FUTURAS PARA VENDEDOR ===
// TODO: router.get('/vendedor/stats', requireVendedor, dashboardController.getVendedorStats);

module.exports = router;