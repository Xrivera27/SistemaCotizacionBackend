const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireAdmin } = require('../middlewares/authorization');

// Middleware de autenticación para todas las rutas del dashboard
router.use(authenticateToken);

// === RUTAS PARA DASHBOARD ADMINISTRADOR ===
// Solo administradores pueden ver el dashboard completo de admin

// Obtener estadísticas generales (cards superiores)
router.get('/admin/stats', requireAdmin, dashboardController.getAdminStats);

// Obtener datos para gráfico de colaboradores
router.get('/admin/colaboradores-chart', requireAdmin, dashboardController.getColaboradoresChart);

// Obtener datos para gráfico de servicios más cotizados
router.get('/admin/servicios-chart', requireAdmin, dashboardController.getServiciosChart);

// Obtener resumen mensual de ventas
router.get('/admin/resumen-mensual', requireAdmin, dashboardController.getResumenMensual);

// Obtener cotizaciones recientes
router.get('/admin/cotizaciones-recientes', requireAdmin, dashboardController.getCotizacionesRecientes);

// Obtener todos los datos del dashboard de una vez (para carga inicial)
router.get('/admin/all-data', requireAdmin, dashboardController.getAllDashboardData);

// === RUTAS FUTURAS PARA OTROS DASHBOARDS ===

// TODO: Dashboard de vendedor
// router.get('/vendedor/stats', requireVendedor, dashboardController.getVendedorStats);

// TODO: Dashboard de super usuario  
// router.get('/super-usuario/stats', requireAdminOrSuper, dashboardController.getSuperUsuarioStats);

module.exports = router;