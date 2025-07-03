const dashboardService = require('../services/dashboardService');

class DashboardController {
  
  // GET /api/dashboard/admin/stats
  async getAdminStats(req, res) {
    try {
      const stats = await dashboardService.getAdminStats();
      
      res.status(200).json({
        success: true,
        data: stats,
        message: 'Estadísticas generales obtenidas correctamente'
      });
    } catch (error) {
      console.error('Error al obtener estadísticas del admin:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener estadísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/dashboard/admin/colaboradores-chart
  async getColaboradoresChart(req, res) {
    try {
      const chartData = await dashboardService.getColaboradoresChart();
      
      res.status(200).json({
        success: true,
        data: chartData,
        message: 'Datos del gráfico de colaboradores obtenidos correctamente'
      });
    } catch (error) {
      console.error('Error al obtener datos del gráfico de colaboradores:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener datos del gráfico',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/dashboard/admin/servicios-chart
  async getServiciosChart(req, res) {
    try {
      const chartData = await dashboardService.getServiciosChart();
      
      res.status(200).json({
        success: true,
        data: chartData,
        message: 'Datos del gráfico de servicios obtenidos correctamente'
      });
    } catch (error) {
      console.error('Error al obtener datos del gráfico de servicios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener datos del gráfico',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/dashboard/admin/resumen-mensual?mes=actual|anterior|hace2
  async getResumenMensual(req, res) {
    try {
      const { mes = 'actual' } = req.query;
      const resumen = await dashboardService.getResumenMensual(mes);
      
      res.status(200).json({
        success: true,
        data: resumen,
        message: 'Resumen mensual obtenido correctamente'
      });
    } catch (error) {
      console.error('Error al obtener resumen mensual:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener resumen mensual',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/dashboard/admin/cotizaciones-recientes?limit=10
  async getCotizacionesRecientes(req, res) {
    try {
      const { limit = 8 } = req.query;
      const cotizaciones = await dashboardService.getCotizacionesRecientes(parseInt(limit));
      
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

  // GET /api/dashboard/admin/all-data - Endpoint para cargar todos los datos de una vez
  async getAllDashboardData(req, res) {
    try {
      const { mes = 'actual' } = req.query;
      
      const [stats, colaboradoresChart, serviciosChart, resumenMensual, cotizacionesRecientes] = 
        await Promise.all([
          dashboardService.getAdminStats(),
          dashboardService.getColaboradoresChart(),
          dashboardService.getServiciosChart(),
          dashboardService.getResumenMensual(mes),
          dashboardService.getCotizacionesRecientes(8)
        ]);

      res.status(200).json({
        success: true,
        data: {
          stats,
          colaboradoresChart,
          serviciosChart,
          resumenMensual,
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

module.exports = new DashboardController();