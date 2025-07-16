// controllers/unidadesMedidaController.js

const unidadesMedidaService = require('../services/unidadesMedidaService');

class UnidadesMedidaController {
  
  // ==================== OBTENER UNIDADES CON PAGINACIÓN ====================
  async getUnidades(req, res) {
    try {
      console.log('📡 GET /api/unidades-medida - Parámetros:', req.query);
      
      const filtros = {
        page: req.query.page || 1,
        limit: req.query.limit || 25,
        search: req.query.search,
        tipo: req.query.tipo,
        activo: req.query.activo
      };

      const result = await unidadesMedidaService.getUnidades(filtros);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: 'Unidades de medida obtenidas exitosamente'
        });
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Error en getUnidades:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== OBTENER UNIDAD POR ID ====================
  async getUnidadById(req, res) {
    try {
      const { id } = req.params;
      console.log(`📡 GET /api/unidades-medida/${id}`);
      
      const result = await unidadesMedidaService.getUnidadById(id);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: 'Unidad de medida obtenida exitosamente'
        });
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('❌ Error en getUnidadById:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== CREAR UNIDAD ====================
  async createUnidad(req, res) {
    try {
      console.log('📡 POST /api/unidades-medida - Datos:', req.body);
      
      const result = await unidadesMedidaService.createUnidad(req.body);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Error en createUnidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== ACTUALIZAR UNIDAD ====================
  async updateUnidad(req, res) {
    try {
      const { id } = req.params;
      console.log(`📡 PUT /api/unidades-medida/${id} - Datos:`, req.body);
      
      const result = await unidadesMedidaService.updateUnidad(id, req.body);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Error en updateUnidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== DESACTIVAR UNIDAD ====================
  async deleteUnidad(req, res) {
    try {
      const { id } = req.params;
      console.log(`📡 DELETE /api/unidades-medida/${id}`);
      
      const result = await unidadesMedidaService.deleteUnidad(id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Error en deleteUnidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== REACTIVAR UNIDAD ====================
  async restoreUnidad(req, res) {
    try {
      const { id } = req.params;
      console.log(`📡 POST /api/unidades-medida/${id}/restore`);
      
      const result = await unidadesMedidaService.restoreUnidad(id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Error en restoreUnidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== OBTENER ESTADÍSTICAS ====================
  async getEstadisticas(req, res) {
    try {
      console.log('📡 GET /api/unidades-medida/estadisticas');
      
      const result = await unidadesMedidaService.getEstadisticas();
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: 'Estadísticas obtenidas exitosamente'
        });
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Error en getEstadisticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== BUSCAR UNIDADES ====================
  async buscarUnidades(req, res) {
    try {
      const { q } = req.query;
      console.log(`📡 GET /api/unidades-medida/search?q=${q}`);
      
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El término de búsqueda debe tener al menos 2 caracteres'
        });
      }

      const result = await unidadesMedidaService.buscarUnidades(q.trim());
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: 'Búsqueda completada exitosamente'
        });
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Error en buscarUnidades:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new UnidadesMedidaController();