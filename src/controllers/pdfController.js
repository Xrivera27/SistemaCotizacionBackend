// controllers/pdfController.js
const pdfGenerator = require('../utils/pdfGenerator');
const { getCotizacionById } = require('../services/cotizacionService');

class PDFController {
  
  async generarPDFCotizacion(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener cotización completa
      const result = await getCotizacionById(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      const cotizacion = result.cotizacion;
      
      // Verificar permisos
      if (req.user.tipo_usuario === 'vendedor' && 
          cotizacion.usuarios_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para generar este PDF'
        });
      }
      
      // Generar PDF
      const pdfBuffer = await pdfGenerator.generarCotizacionPDF(cotizacion);
      
      // Configurar headers para descarga
      const filename = `Cotizacion_${cotizacion.cotizaciones_id}_${cotizacion.cliente.nombre_empresa.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Método adicional para preview PDF
  async previewPDFCotizacion(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener cotización completa
      const cotizacionService = require('../services/cotizacionService');
      const result = await cotizacionService.getCotizacionById(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      const cotizacion = result.cotizacion;
      
      // Verificar permisos
      if (req.user.tipo_usuario === 'vendedor' && 
          cotizacion.usuarios_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este PDF'
        });
      }
      
      // Generar PDF
      const pdfBuffer = await pdfGenerator.generarCotizacionPDF(cotizacion);
      
      // Configurar headers para mostrar en el navegador
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Error generando preview PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new PDFController();