const superDashboardService = require('../services/superDashboardService');

class SuperDashboardController {
  
  // GET /api/dashboard/super-usuario/stats
  async getSuperUsuarioStats(req, res) {
    try {
      const stats = await superDashboardService.getSuperUsuarioStats();
      
      res.status(200).json({
        success: true,
        data: stats,
        message: 'Estadísticas del supervisor obtenidas correctamente'
      });
    } catch (error) {
      console.error('Error al obtener estadísticas del super usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener estadísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/dashboard/super-usuario/efectivas-vs-canceladas
  async getEfectivasVsCanceladas(req, res) {
    try {
      const { dias = 30 } = req.query;
      const chartData = await superDashboardService.getEfectivasVsCanceladas(parseInt(dias));
      
      res.status(200).json({
        success: true,
        data: chartData,
        message: 'Datos del gráfico comparativo obtenidos correctamente'
      });
    } catch (error) {
      console.error('Error al obtener gráfico comparativo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener datos del gráfico',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/dashboard/super-usuario/colaboradores-chart
  async getColaboradoresChart(req, res) {
    try {
      const chartData = await superDashboardService.getColaboradoresChart();
      
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

  // GET /api/dashboard/super-usuario/servicios-chart
  async getServiciosChart(req, res) {
    try {
      const chartData = await superDashboardService.getServiciosChart();
      
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

  // GET /api/dashboard/super-usuario/resumen-mensual?mes=actual|anterior|hace2
  async getResumenMensual(req, res) {
    try {
      const { mes = 'actual' } = req.query;
      const resumen = await superDashboardService.getResumenMensual(mes, req.user.usuarios_id);
      
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

  // GET /api/dashboard/super-usuario/cotizaciones-pendientes-aprobacion
  async getCotizacionesPendientesAprobacion(req, res) {
    try {
      const cotizaciones = await superDashboardService.getCotizacionesPendientesAprobacion();
      
      res.status(200).json({
        success: true,
        data: cotizaciones,
        message: 'Cotizaciones pendientes de aprobación obtenidas correctamente'
      });
    } catch (error) {
      console.error('Error al obtener cotizaciones pendientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener cotizaciones pendientes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // POST /api/dashboard/super-usuario/aprobar-cotizacion
  async aprobarCotizacion(req, res) {
    try {
      const { cotizacionId } = req.body;
      const superUsuarioId = req.user.usuarios_id;
      const superUsuarioNombre = req.user.nombre_completo;
      
      if (!cotizacionId) {
        return res.status(400).json({
          success: false,
          message: 'ID de cotización requerido'
        });
      }

      const resultado = await superDashboardService.aprobarCotizacion(
        cotizacionId, 
        superUsuarioId, 
        superUsuarioNombre
      );
      
      res.status(200).json({
        success: true,
        data: resultado,
        message: 'Cotización aprobada exitosamente'
      });
    } catch (error) {
      console.error('Error al aprobar cotización:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor al aprobar cotización',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // POST /api/dashboard/super-usuario/rechazar-cotizacion
  async rechazarCotizacion(req, res) {
    try {
      const { cotizacionId, motivo } = req.body;
      const superUsuarioId = req.user.usuarios_id;
      const superUsuarioNombre = req.user.nombre_completo;
      
      if (!cotizacionId) {
        return res.status(400).json({
          success: false,
          message: 'ID de cotización requerido'
        });
      }

      if (!motivo || motivo.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Motivo de rechazo requerido'
        });
      }

      const resultado = await superDashboardService.rechazarCotizacion(
        cotizacionId, 
        superUsuarioId, 
        superUsuarioNombre,
        motivo.trim()
      );
      
      res.status(200).json({
        success: true,
        data: resultado,
        message: 'Cotización rechazada exitosamente'
      });
    } catch (error) {
      console.error('Error al rechazar cotización:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor al rechazar cotización',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/dashboard/super-usuario/all-data - Endpoint para cargar todos los datos de una vez
  async getAllDashboardData(req, res) {
    try {
      const { mes = 'actual', dias = 30 } = req.query;
      const superUsuarioId = req.user.usuarios_id;
      
      const [stats, efectivasVsCanceladas, colaboradoresChart, serviciosChart, resumenMensual, cotizacionesPendientes] = 
        await Promise.all([
          superDashboardService.getSuperUsuarioStats(),
          superDashboardService.getEfectivasVsCanceladas(parseInt(dias)),
          superDashboardService.getColaboradoresChart(),
          superDashboardService.getServiciosChart(),
          superDashboardService.getResumenMensual(mes, superUsuarioId),
          superDashboardService.getCotizacionesPendientesAprobacion()
        ]);

      res.status(200).json({
        success: true,
        data: {
          stats,
          efectivasVsCanceladas,
          colaboradoresChart,
          serviciosChart,
          resumenMensual,
          cotizacionesPendientes
        },
        message: 'Todos los datos del dashboard del supervisor obtenidos correctamente'
      });
    } catch (error) {
      console.error('Error al obtener todos los datos del dashboard super usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener datos del dashboard',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new SuperDashboardController();