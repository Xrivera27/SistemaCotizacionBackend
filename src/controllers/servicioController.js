const servicioService = require('../services/servicioService');

class ServicioController {
  
  // Obtener todos los servicios con paginación y filtros
  async getServicios(req, res) {
    try {
      console.log('=== GET SERVICIOS ===');
      console.log('Query params:', req.query);
      console.log('Usuario:', req.user);
      
      const filters = { ...req.query };
      
      const result = await servicioService.getServicios(filters);
      
      console.log(`✅ Servicios encontrados: ${result.pagination.totalItems}`);
      
      res.json({
        success: true,
        data: {
          servicios: result.servicios,
          pagination: result.pagination
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo servicios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener servicio por ID
  async getServicioById(req, res) {
    try {
      console.log('=== GET SERVICIO BY ID ===');
      const { id } = req.params;
      console.log('ID solicitado:', id);
      
      const result = await servicioService.getServicioById(id);
      
      if (!result.success) {
        console.log('❌ Servicio no encontrado');
        return res.status(404).json(result);
      }
      
      console.log('✅ Servicio encontrado:', result.servicio.nombre);
      
      res.json({
        success: true,
        data: { servicio: result.servicio }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Crear nuevo servicio
  async createServicio(req, res) {
    try {
      console.log('=== CREATE SERVICIO ===');
      console.log('Datos recibidos:', req.validatedData);
      console.log('Usuario creador:', req.user);
      
      const result = await servicioService.createServicio(req.validatedData);
      
      if (!result.success) {
        console.log('❌ Error creando servicio:', result.message);
        return res.status(400).json(result);
      }
      
      console.log('✅ Servicio creado exitosamente:', result.servicio.nombre);
      
      res.status(201).json({
        success: true,
        message: result.message,
        data: { servicio: result.servicio }
      });
      
    } catch (error) {
      console.error('❌ Error creando servicio:', error);
      
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
  
  // Actualizar servicio
  async updateServicio(req, res) {
    try {
      console.log('=== UPDATE SERVICIO ===');
      const { id } = req.params;
      console.log('ID a actualizar:', id);
      console.log('Datos recibidos:', req.validatedData);
      
      // Verificar que el servicio existe
      const servicioCheck = await servicioService.getServicioById(id);
      if (!servicioCheck.success) {
        return res.status(404).json(servicioCheck);
      }
      
      const result = await servicioService.updateServicio(id, req.validatedData);
      
      if (!result.success) {
        console.log('❌ Error actualizando servicio:', result.message);
        return res.status(400).json(result);
      }
      
      console.log('✅ Servicio actualizado exitosamente');
      
      res.json({
        success: true,
        message: result.message,
        data: { servicio: result.servicio }
      });
      
    } catch (error) {
      console.error('❌ Error actualizando servicio:', error);
      
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
  
  // Eliminar servicio (soft delete)
  async deleteServicio(req, res) {
    try {
      console.log('=== DELETE SERVICIO ===');
      const { id } = req.params;
      console.log('ID a eliminar:', id);
      
      // Verificar que el servicio existe
      const servicioCheck = await servicioService.getServicioById(id);
      if (!servicioCheck.success) {
        return res.status(404).json(servicioCheck);
      }
      
      const result = await servicioService.deleteServicio(id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      console.log('✅ Servicio eliminado exitosamente');
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error eliminando servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Restaurar servicio
  async restoreServicio(req, res) {
    try {
      console.log('=== RESTORE SERVICIO ===');
      const { id } = req.params;
      console.log('ID a restaurar:', id);
      
      const result = await servicioService.restoreServicio(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      console.log('✅ Servicio restaurado exitosamente');
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error restaurando servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener estadísticas de servicios
  async getEstadisticas(req, res) {
    try {
      console.log('=== GET ESTADISTICAS SERVICIOS ===');
      
      const result = await servicioService.getEstadisticas();
      
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
  
  // Buscar servicios para autocompletado
  async searchServicios(req, res) {
    try {
      console.log('=== SEARCH SERVICIOS ===');
      const { q, limit = 10 } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.json({
          success: true,
          data: { servicios: [] }
        });
      }
      
      const result = await servicioService.searchServicios(q.trim(), limit);
      
      console.log(`✅ Servicios encontrados para búsqueda: ${result.servicios.length}`);
      
      res.json({
        success: true,
        data: { servicios: result.servicios }
      });
      
    } catch (error) {
      console.error('❌ Error buscando servicios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener servicios activos (sin paginación para selects)
  async getServiciosActivos(req, res) {
    try {
      console.log('=== GET SERVICIOS ACTIVOS ===');
      
      const result = await servicioService.getServiciosActivos();
      
      console.log(`✅ Servicios activos encontrados: ${result.servicios.length}`);
      
      res.json({
        success: true,
        data: { servicios: result.servicios }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo servicios activos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener servicios por categoría
  async getServiciosPorCategoria(req, res) {
    try {
      console.log('=== GET SERVICIOS POR CATEGORIA ===');
      const { categoria_id } = req.params;
      console.log('Categoría ID:', categoria_id);
      
      const result = await servicioService.getServiciosPorCategoria(categoria_id);
      
      console.log(`✅ Servicios encontrados para categoría: ${result.servicios.length}`);
      
      res.json({
        success: true,
        data: { servicios: result.servicios }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo servicios por categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new ServicioController();