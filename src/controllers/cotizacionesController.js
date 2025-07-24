// controllers/cotizacionesController.js
const cotizacionService = require('../services/cotizacionService');

class CotizacionController {
  
  // Crear nueva cotización
  async createCotizacion(req, res) {
    try {
      // Asignar el usuario actual como vendedor
      req.validatedData.usuarios_id = req.user.id;
      
      const result = await cotizacionService.createCotizacion(req.validatedData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json({
        success: true,
        message: result.message,
        data: { 
          cotizacion: result.cotizacion,
          requiere_aprobacion: result.requiere_aprobacion
        }
      });
      
    } catch (error) {
      console.error('❌ Error creando cotización:', error);
      
      if (error.name === 'SequelizeValidationError') {
        const errores = error.errors.map(err => ({
          campo: err.path,
          mensaje: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errores
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener cotizaciones del usuario
  async getCotizaciones(req, res) {
    try {
      const filters = { ...req.query };
      
      // Si el usuario es vendedor, solo puede ver sus propias cotizaciones
      if (req.user.tipo_usuario === 'vendedor') {
        filters.usuarios_id = req.user.id;
      }
      
      const result = await cotizacionService.getCotizaciones(filters);
      
      res.json({
        success: true,
        data: {
          cotizaciones: result.cotizaciones,
          pagination: result.pagination
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo cotizaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener cotización por ID
  async getCotizacionById(req, res) {
    try {
      const { id } = req.params;
      
      const result = await cotizacionService.getCotizacionById(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      // Verificar permisos: vendedores solo pueden ver sus cotizaciones
      if (req.user.tipo_usuario === 'vendedor' && 
          result.cotizacion.usuarios_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta cotización'
        });
      }
      
      res.json({
        success: true,
        data: { cotizacion: result.cotizacion }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo cotización:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Actualizar estado de cotización (solo admins)
  async updateEstadoCotizacion(req, res) {
    try {
      const { id } = req.params;
      
      // Solo admins y super usuarios pueden cambiar estados
      if (!['admin', 'super_usuario'].includes(req.user.tipo_usuario)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esta acción'
        });
      }
      
      const result = await cotizacionService.updateEstadoCotizacion(id, req.validatedData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json({
        success: true,
        message: result.message,
        data: { cotizacion: result.cotizacion }
      });
      
    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Marcar PDF como generado
  async marcarPDFGenerado(req, res) {
    try {
      const { id } = req.params;
      
      const result = await cotizacionService.marcarPDFGenerado(id, req.user.id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error marcando PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener cotizaciones pendientes de aprobación (solo admins)
  async getCotizacionesPendientes(req, res) {
    try {
      // Solo admins y super usuarios pueden ver cotizaciones pendientes
      if (!['admin', 'super_usuario'].includes(req.user.tipo_usuario)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esta acción'
        });
      }
      
      const result = await cotizacionService.getCotizacionesPendientes();
      
      res.json({
        success: true,
        data: { cotizaciones: result.cotizaciones }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo cotizaciones pendientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener estadísticas de cotizaciones
  async getEstadisticas(req, res) {
    try {
      const filters = {};
      
      // Si es vendedor, solo sus estadísticas
      if (req.user.tipo_usuario === 'vendedor') {
        filters.usuarios_id = req.user.id;
      }
      
      const result = await cotizacionService.getEstadisticas(filters);
      
      res.json({
        success: true,
        data: { estadisticas: result.estadisticas }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Duplicar cotización
  async duplicarCotizacion(req, res) {
    try {
      const { id } = req.params;
      
      const result = await cotizacionService.duplicarCotizacion(id, req.user.id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.status(201).json({
        success: true,
        message: result.message,
        data: { cotizacion: result.cotizacion }
      });
      
    } catch (error) {
      console.error('❌ Error duplicando cotización:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new CotizacionController();