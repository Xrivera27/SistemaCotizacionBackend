const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const superDashboardController = require('../controllers/superDashboardController');
const vendedorDashboardController = require('../controllers/VendedorDashboardController');
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

// === RUTAS PARA DASHBOARD VENDEDOR === (agregar después de las rutas de super usuario)
router.get('/vendedor/stats', 
  authorizeRoles(['vendedor']), 
  vendedorDashboardController.getVendedorStats
);

router.get('/vendedor/ventas-chart', 
  authorizeRoles(['vendedor']), 
  vendedorDashboardController.getVentasChart
);

router.get('/vendedor/estados-chart', 
  authorizeRoles(['vendedor']), 
  vendedorDashboardController.getEstadosChart
);

router.get('/vendedor/resumen-ventas', 
  authorizeRoles(['vendedor']), 
  vendedorDashboardController.getResumenVentas
);

router.get('/vendedor/cotizaciones-recientes', 
  authorizeRoles(['vendedor']), 
  vendedorDashboardController.getCotizacionesRecientes
);

router.get('/vendedor/all-data', 
  authorizeRoles(['vendedor']), 
  vendedorDashboardController.getAllDashboardData
);

module.exports = router;