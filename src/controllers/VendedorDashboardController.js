const vendedorDashboardService = require('../services/vendedorDashboardService');

class VendedorDashboardController {
  
  // GET /api/dashboard/vendedor/stats
  async getVendedorStats(req, res) {
    try {
      const usuarioId = req.user.usuarios_id;
      const stats = await vendedorDashboardService.getVendedorStats(usuarioId);
      
      res.status(200).json({
        success: true,
        data: stats,
        message: 'Estadísticas del vendedor obtenidas correctamente'
      });
    } catch (error) {
      console.error('Error al obtener estadísticas del vendedor:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener estadísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/dashboard/vendedor/ventas-chart?dias=7
  async getVentasChart(req, res) {
    try {
      const usuarioId = req.user.usuarios_id;
      const { dias = 7 } = req.query;
      const chartData = await vendedorDashboardService.getVentasChart(usuarioId, parseInt(dias));
      
      res.status(200).json({
        success: true,
        data: chartData,
        message: 'Datos del gráfico de ventas obtenidos correctamente'
      });
    } catch (error) {
      console.error('Error al obtener datos del gráfico de ventas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener datos del gráfico',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/dashboard/vendedor/estados-chart
  async getEstadosChart(req, res) {
    try {
      const usuarioId = req.user.usuarios_id;
      const chartData = await vendedorDashboardService.getEstadosChart(usuarioId);
      
      res.status(200).json({
        success: true,
        data: chartData,
        message: 'Datos del gráfico de estados obtenidos correctamente'
      });
    } catch (error) {
      console.error('Error al obtener datos del gráfico de estados:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener datos del gráfico',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/dashboard/vendedor/resumen-ventas?periodo=semana|quincena|mes
  async getResumenVentas(req, res) {
    try {
      const usuarioId = req.user.usuarios_id;
      const { periodo = 'mes' } = req.query;
      const resumen = await vendedorDashboardService.getResumenVentas(usuarioId, periodo);
      
      res.status(200).json({
        success: true,
        data: resumen,
        message: 'Resumen de ventas obtenido correctamente'
      });
    } catch (error) {
      console.error('Error al obtener resumen de ventas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener resumen de ventas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/dashboard/vendedor/cotizaciones-recientes?limit=5
  async getCotizacionesRecientes(req, res) {
    try {
      const usuarioId = req.user.usuarios_id;
      const { limit = 5 } = req.query;
      const cotizaciones = await vendedorDashboardService.getCotizacionesRecientes(usuarioId, parseInt(limit));
      
      res.status(200).json({
        success: true,
        data: cotizaciones,
        message: 'Cotizaciones recientes obtenidas correctamente'
      });
    } catch (error) {
      console.error('Error al obtener cotizaciones recientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener cotizaciones recientes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/dashboard/vendedor/all-data - Endpoint para cargar todos los datos de una vez
  async getAllDashboardData(req, res) {
    try {
      const usuarioId = req.user.usuarios_id;
      const { periodo = 'mes', dias = 7 } = req.query;
      
      const [stats, ventasChart, estadosChart, resumenVentas, cotizacionesRecientes] = 
        await Promise.all([
          vendedorDashboardService.getVendedorStats(usuarioId),
          vendedorDashboardService.getVentasChart(usuarioId, parseInt(dias)),
          vendedorDashboardService.getEstadosChart(usuarioId),
          vendedorDashboardService.getResumenVentas(usuarioId, periodo),
          vendedorDashboardService.getCotizacionesRecientes(usuarioId, 5)
        ]);

      res.status(200).json({
        success: true,
        data: {
          stats,
          ventasChart,
          estadosChart,
          resumenVentas,
          cotizacionesRecientes
        },
        message: 'Todos los datos del dashboard obtenidos correctamente'
      });
    } catch (error) {
      console.error('Error al obtener todos los datos del dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener datos del dashboard',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new VendedorDashboardController();