const reportesService = require('../services/reportesService');
const PDFService = require('../services/pdfService');

class ReportesController {
  
  // GET /api/reportes/tipos
  async getTiposReporte(req, res) {
    try {
      const tipos = await reportesService.getTiposReporte();
      
      res.status(200).json({
        success: true,
        data: tipos,
        message: 'Tipos de reporte obtenidos correctamente'
      });
    } catch (error) {
      console.error('Error al obtener tipos de reporte:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/reportes/opciones
  async getOpcionesReporte(req, res) {
    try {
      const opciones = await reportesService.getOpcionesReporte();
      
      res.status(200).json({
        success: true,
        data: opciones,
        message: 'Opciones de reporte obtenidas correctamente'
      });
    } catch (error) {
      console.error('Error al obtener opciones de reporte:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // POST /api/reportes/generar
  async generarReporte(req, res) {
    try {
      const { tipo, filtros } = req.body;
      
      if (!tipo) {
        return res.status(400).json({
          success: false,
          message: 'El tipo de reporte es requerido'
        });
      }

      const reporte = await reportesService.generarReporte(tipo, filtros || {});
      
      res.status(200).json({
        success: true,
        data: reporte,
        message: 'Reporte generado correctamente'
      });
    } catch (error) {
      console.error('Error al generar reporte:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al generar reporte',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // POST /api/reportes/exportar
  async exportarReporte(req, res) {
    try {
      const { tipo, formato = 'pdf', filtros, datos } = req.body;
      
      if (!tipo) {
        return res.status(400).json({
          success: false,
          message: 'El tipo de reporte es requerido'
        });
      }

      const archivoExportado = await reportesService.exportarReporte(tipo, formato, filtros, datos);
      
      res.status(200).json({
        success: true,
        data: archivoExportado,
        message: 'Reporte exportado correctamente'
      });
    } catch (error) {
      console.error('Error al exportar reporte:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al exportar reporte',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/reportes/cotizaciones
  async getReporteCotizaciones(req, res) {
    try {
      const filtros = {
        periodo: req.query.periodo || '30',
        fechaInicio: req.query.fechaInicio,
        fechaFin: req.query.fechaFin,
        estado: req.query.estado,
        vendedor: req.query.vendedor
      };

      const reporte = await reportesService.generarReporteCotizaciones(filtros);
      
      res.status(200).json({
        success: true,
        data: reporte,
        message: 'Reporte de cotizaciones generado correctamente'
      });
    } catch (error) {
      console.error('Error al generar reporte de cotizaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/reportes/vendedores
  async getReporteVendedores(req, res) {
    try {
      const filtros = {
        periodo: req.query.periodo || '30',
        fechaInicio: req.query.fechaInicio,
        fechaFin: req.query.fechaFin,
        vendedor: req.query.vendedor
      };

      const reporte = await reportesService.generarReporteVendedores(filtros);
      
      res.status(200).json({
        success: true,
        data: reporte,
        message: 'Reporte de vendedores generado correctamente'
      });
    } catch (error) {
      console.error('Error al generar reporte de vendedores:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/reportes/servicios
  async getReporteServicios(req, res) {
    try {
      const filtros = {
        periodo: req.query.periodo || '30',
        fechaInicio: req.query.fechaInicio,
        fechaFin: req.query.fechaFin,
        servicio: req.query.servicio,
        categoria: req.query.categoria
      };

      const reporte = await reportesService.generarReporteServicios(filtros);
      
      res.status(200).json({
        success: true,
        data: reporte,
        message: 'Reporte de servicios generado correctamente'
      });
    } catch (error) {
      console.error('Error al generar reporte de servicios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/reportes/clientes
  async getReporteClientes(req, res) {
    try {
      const filtros = {
        periodo: req.query.periodo || '30',
        fechaInicio: req.query.fechaInicio,
        fechaFin: req.query.fechaFin,
        cliente: req.query.cliente,
        vendedor: req.query.vendedor
      };

      const reporte = await reportesService.generarReporteClientes(filtros);
      
      res.status(200).json({
        success: true,
        data: reporte,
        message: 'Reporte de clientes generado correctamente'
      });
    } catch (error) {
      console.error('Error al generar reporte de clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/reportes/financiero
  async getReporteFinanciero(req, res) {
    try {
      const filtros = {
        periodo: req.query.periodo || '90',
        fechaInicio: req.query.fechaInicio,
        fechaFin: req.query.fechaFin,
        agrupacion: req.query.agrupacion || 'mensual' // mensual, semanal, diario
      };

      const reporte = await reportesService.generarReporteFinanciero(filtros);
      
      res.status(200).json({
        success: true,
        data: reporte,
        message: 'Reporte financiero generado correctamente'
      });
    } catch (error) {
      console.error('Error al generar reporte financiero:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // POST /api/reportes/generar-pdf
  async generarPDF(req, res) {
    try {
      const { tipo, filtros } = req.body;
      
      if (!tipo) {
        return res.status(400).json({
          success: false,
          message: 'El tipo de reporte es requerido'
        });
      }

      // Generar los datos del reporte
      const datosReporte = await reportesService.generarReporte(tipo, filtros || {});
      
      // Generar PDF
      const pdfResult = await PDFService.generarReportePDF(tipo, datosReporte, filtros);
      
      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.filename}"`);
      res.setHeader('Content-Length', pdfResult.buffer.length);
      
      res.send(pdfResult.buffer);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al generar PDF',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new ReportesController();