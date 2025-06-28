// controllers/cotizacionesController.js
const cotizacionService = require('../services/cotizacionService');

class CotizacionController {
  
  // Crear nueva cotización
  async createCotizacion(req, res) {
    try {
      console.log('=== CREATE COTIZACION ===');
      console.log('Datos recibidos:', req.validatedData);
      console.log('Usuario:', req.user);
      
      // Asignar el usuario actual como vendedor
      req.validatedData.usuarios_id = req.user.id;
      
      const result = await cotizacionService.createCotizacion(req.validatedData);
      
      if (!result.success) {
        console.log('❌ Error creando cotización:', result.message);
        return res.status(400).json(result);
      }
      
      console.log('✅ Cotización creada exitosamente:', result.cotizacion.cotizaciones_id);
      
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
      console.log('=== GET COTIZACIONES ===');
      console.log('Query params:', req.query);
      console.log('Usuario:', req.user);
      
      const filters = { ...req.query };
      
      // Si el usuario es vendedor, solo puede ver sus propias cotizaciones
      if (req.user.tipo_usuario === 'vendedor') {
        filters.usuarios_id = req.user.id;
      }
      
      const result = await cotizacionService.getCotizaciones(filters);
      
      console.log(`✅ Cotizaciones encontradas: ${result.pagination.totalItems}`);
      
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
      console.log('=== GET COTIZACION BY ID ===');
      const { id } = req.params;
      console.log('ID solicitado:', id);
      
      const result = await cotizacionService.getCotizacionById(id);
      
      if (!result.success) {
        console.log('❌ Cotización no encontrada');
        return res.status(404).json(result);
      }
      
      // Verificar permisos: vendedores solo pueden ver sus cotizaciones
      if (req.user.tipo_usuario === 'vendedor' && 
          result.cotizacion.usuarios_id !== req.user.id) {
        console.log('❌ Vendedor intentando acceder a cotización ajena');
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta cotización'
        });
      }
      
      console.log('✅ Cotización encontrada:', result.cotizacion.cotizaciones_id);
      
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
      console.log('=== UPDATE ESTADO COTIZACION ===');
      const { id } = req.params;
      console.log('ID a actualizar:', id);
      console.log('Datos recibidos:', req.validatedData);
      
      // Solo admins y super usuarios pueden cambiar estados
      if (!['admin', 'super_usuario'].includes(req.user.tipo_usuario)) {
        console.log('❌ Usuario sin permisos para cambiar estado');
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esta acción'
        });
      }
      
      const result = await cotizacionService.updateEstadoCotizacion(id, req.validatedData);
      
      if (!result.success) {
        console.log('❌ Error actualizando estado:', result.message);
        return res.status(400).json(result);
      }
      
      console.log('✅ Estado actualizado exitosamente');
      
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
      console.log('=== MARCAR PDF GENERADO ===');
      const { id } = req.params;
      console.log('ID cotización:', id);
      
      const result = await cotizacionService.marcarPDFGenerado(id, req.user.id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      console.log('✅ PDF marcado como generado');
      
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
      console.log('=== GET COTIZACIONES PENDIENTES ===');
      
      // Solo admins y super usuarios pueden ver cotizaciones pendientes
      if (!['admin', 'super_usuario'].includes(req.user.tipo_usuario)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esta acción'
        });
      }
      
      const result = await cotizacionService.getCotizacionesPendientes();
      
      console.log(`✅ Cotizaciones pendientes encontradas: ${result.cotizaciones.length}`);
      
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
      console.log('=== GET ESTADISTICAS COTIZACIONES ===');
      
      const filters = {};
      
      // Si es vendedor, solo sus estadísticas
      if (req.user.tipo_usuario === 'vendedor') {
        filters.usuarios_id = req.user.id;
      }
      
      const result = await cotizacionService.getEstadisticas(filters);
      
      console.log('✅ Estadísticas calculadas:', result.estadisticas);
      
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
      console.log('=== DUPLICAR COTIZACION ===');
      const { id } = req.params;
      console.log('ID a duplicar:', id);
      
      const result = await cotizacionService.duplicarCotizacion(id, req.user.id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      console.log('✅ Cotización duplicada exitosamente');
      
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