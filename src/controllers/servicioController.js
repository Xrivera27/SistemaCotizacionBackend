const servicioService = require('../services/servicioService');

class ServicioController {
  
  // 🔧 CORREGIDO: Obtener todos los servicios con paginación y filtros (múltiples categorías)
  async getServicios(req, res) {
    try {
      console.log('=== GET SERVICIOS ===');
      console.log('Query params:', req.query);
      console.log('Usuario:', req.user);
      
      const filters = { ...req.query };
      
      const result = await servicioService.getServicios(filters);
      
      console.log(`✅ Servicios encontrados: ${result.pagination.totalItems}`);
      
      // ✅ ACTUALIZADO: Formatear servicios con múltiples categorías
      const serviciosFormateados = result.servicios.map(servicio => 
        servicioService.formatServicioDisplay(servicio)
      );
      
      res.json({
        success: true,
        data: {
          servicios: serviciosFormateados,
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
  
  // 🔧 CORREGIDO: Obtener servicio por ID (con múltiples categorías)
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
      
      // ✅ ACTUALIZADO: Formatear servicio individual con múltiples categorías
      const servicioFormateado = servicioService.formatServicioDisplay(result.servicio);
      
      // 🆕 NUEVO: Obtener categorías completas del servicio
      const categoriasResult = await servicioService.getCategoriesForServicio(id);
      
      res.json({
        success: true,
        data: { 
          servicio: {
            ...servicioFormateado,
            categorias_completas: categoriasResult.success ? categoriasResult.categorias : []
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // 🔧 CORREGIDO: Crear nuevo servicio (con múltiples categorías)
  async createServicio(req, res) {
    try {
      console.log('=== CREATE SERVICIO ===');
      console.log('Datos recibidos:', req.validatedData);
      console.log('Usuario creador:', req.user);
      
      // 🆕 NUEVO: Validar estructura de categorías
      const { categorias, categoria_principal } = req.validatedData;
      
      if (categorias && Array.isArray(categorias)) {
        const validationResult = servicioService.validateCategoriasStructure(categorias);
        if (!validationResult.valid) {
          return res.status(400).json({
            success: false,
            message: validationResult.message
          });
        }
        
        // Verificar conflictos de nombres
        const conflictCheck = await servicioService.checkNameConflicts(
          req.validatedData.nombre, 
          categorias
        );
        
        if (conflictCheck.hasConflicts) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un servicio con ese nombre en una de las categorías seleccionadas',
            conflicts: conflictCheck.conflicts
          });
        }
      }
      
      const result = await servicioService.createServicio(req.validatedData);
      
      if (!result.success) {
        console.log('❌ Error creando servicio:', result.message);
        return res.status(400).json(result);
      }
      
      console.log('✅ Servicio creado exitosamente:', result.servicio.nombre);
      
      // ✅ ACTUALIZADO: Formatear servicio creado con múltiples categorías
      const servicioFormateado = servicioService.formatServicioDisplay(result.servicio);
      
      res.status(201).json({
        success: true,
        message: result.message,
        data: { servicio: servicioFormateado }
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
  
  // 🔧 CORREGIDO: Actualizar servicio (con múltiples categorías)
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
      
      // 🆕 NUEVO: Validar categorías si se proporcionan
      const { categorias } = req.validatedData;
      
      if (categorias && Array.isArray(categorias)) {
        const validationResult = servicioService.validateCategoriasStructure(categorias);
        if (!validationResult.valid) {
          return res.status(400).json({
            success: false,
            message: validationResult.message
          });
        }
        
        // Verificar conflictos de nombres (excluyendo el servicio actual)
        const conflictCheck = await servicioService.checkNameConflicts(
          req.validatedData.nombre || servicioCheck.servicio.nombre, 
          categorias,
          id
        );
        
        if (conflictCheck.hasConflicts) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un servicio con ese nombre en una de las categorías seleccionadas',
            conflicts: conflictCheck.conflicts
          });
        }
      }
      
      const result = await servicioService.updateServicio(id, req.validatedData);
      
      if (!result.success) {
        console.log('❌ Error actualizando servicio:', result.message);
        return res.status(400).json(result);
      }
      
      console.log('✅ Servicio actualizado exitosamente');
      
      // ✅ ACTUALIZADO: Formatear servicio actualizado con múltiples categorías
      const servicioFormateado = servicioService.formatServicioDisplay(result.servicio);
      
      res.json({
        success: true,
        message: result.message,
        data: { servicio: servicioFormateado }
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
      
      // ✅ ACTUALIZADO: Formatear servicios de búsqueda con múltiples categorías
      const serviciosFormateados = result.servicios.map(servicio => 
        servicioService.formatServicioDisplay(servicio)
      );
      
      res.json({
        success: true,
        data: { servicios: serviciosFormateados }
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
      
      // ✅ ACTUALIZADO: Formatear servicios activos con múltiples categorías
      const serviciosFormateados = result.servicios.map(servicio => 
        servicioService.formatServicioDisplay(servicio)
      );
      
      res.json({
        success: true,
        data: { servicios: serviciosFormateados }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo servicios activos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // 🔧 CORREGIDO: Obtener servicios por categoría (considerando múltiples categorías)
  async getServiciosPorCategoria(req, res) {
    try {
      console.log('=== GET SERVICIOS POR CATEGORIA ===');
      const { categoria_id } = req.params;
      console.log('Categoría ID:', categoria_id);
      
      const result = await servicioService.getServiciosPorCategoria(categoria_id);
      
      console.log(`✅ Servicios encontrados para categoría: ${result.servicios.length}`);
      
      // ✅ ACTUALIZADO: Formatear servicios por categoría con múltiples categorías
      const serviciosFormateados = result.servicios.map(servicio => 
        servicioService.formatServicioDisplay(servicio)
      );
      
      res.json({
        success: true,
        data: { servicios: serviciosFormateados }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo servicios por categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // 🆕 NUEVO: Obtener todas las categorías de un servicio
  async getCategoriesForServicio(req, res) {
    try {
      console.log('=== GET CATEGORIES FOR SERVICIO ===');
      const { id } = req.params;
      console.log('Servicio ID:', id);
      
      const result = await servicioService.getCategoriesForServicio(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      console.log(`✅ Categorías encontradas: ${result.categorias.length}`);
      
      res.json({
        success: true,
        data: { categorias: result.categorias }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo categorías del servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // 🆕 NUEVO: Obtener servicios con categorías expandidas
  async getServiciosWithExpandedCategories(req, res) {
    try {
      console.log('=== GET SERVICIOS WITH EXPANDED CATEGORIES ===');
      
      const filters = { ...req.query };
      const result = await servicioService.getServiciosWithExpandedCategories(filters);
      
      console.log(`✅ Servicios con categorías expandidas: ${result.servicios.length}`);
      
      res.json({
        success: true,
        data: {
          servicios: result.servicios,
          pagination: result.pagination
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo servicios con categorías expandidas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // 🆕 NUEVO: Obtener servicios relacionados
  async getRelatedServicios(req, res) {
    try {
      console.log('=== GET RELATED SERVICIOS ===');
      const { id } = req.params;
      const { limit = 5 } = req.query;
      console.log('Servicio ID:', id, 'Limit:', limit);
      
      const result = await servicioService.getRelatedServicios(id, limit);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      console.log(`✅ Servicios relacionados encontrados: ${result.servicios.length}`);
      
      res.json({
        success: true,
        data: { servicios: result.servicios }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo servicios relacionados:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // 🆕 NUEVO: Verificar conflictos de nombres
  async checkNameConflicts(req, res) {
    try {
      console.log('=== CHECK NAME CONFLICTS ===');
      const { nombre, categorias } = req.body;
      const { excludeId } = req.query;
      
      if (!nombre || !categorias || !Array.isArray(categorias)) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y categorías son requeridos'
        });
      }
      
      const result = await servicioService.checkNameConflicts(nombre, categorias, excludeId);
      
      console.log(`✅ Verificación de conflictos: ${result.hasConflicts ? 'Conflictos encontrados' : 'Sin conflictos'}`);
      
      res.json({
        success: true,
        data: {
          hasConflicts: result.hasConflicts,
          conflicts: result.conflicts
        }
      });
      
    } catch (error) {
      console.error('❌ Error verificando conflictos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // 🆕 NUEVO: Obtener estadísticas avanzadas por categoría
  async getAdvancedCategoryStats(req, res) {
    try {
      console.log('=== GET ADVANCED CATEGORY STATS ===');
      
      const result = await servicioService.getAdvancedCategoryStats();
      
      if (!result.success) {
        return res.status(500).json(result);
      }
      
      console.log(`✅ Estadísticas avanzadas calculadas para ${result.estadisticas.length} categorías`);
      
      res.json({
        success: true,
        data: { estadisticas: result.estadisticas }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas avanzadas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // 🆕 NUEVO: Migrar servicios a múltiples categorías
  async migrateToMultipleCategories(req, res) {
    try {
      console.log('=== MIGRATE TO MULTIPLE CATEGORIES ===');
      
      const result = await servicioService.migrateToMultipleCategories();
      
      console.log(`✅ Migración completada: ${result.message}`);
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error en migración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // 🆕 NUEVO: Validar integridad de datos
  async validateDataIntegrity(req, res) {
    try {
      console.log('=== VALIDATE DATA INTEGRITY ===');
      
      const result = await servicioService.validateDataIntegrity();
      
      console.log(`✅ Validación completada: ${result.summary?.total_issues || 0} problemas encontrados`);
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error en validación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new ServicioController();