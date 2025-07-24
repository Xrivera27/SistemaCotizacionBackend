const categoriaService = require('../services/categoriaService');

class CategoriaController {
  
  // Obtener todas las categorías con paginación y filtros
  async getCategorias(req, res) {
    try {
      const filters = { ...req.query };
      
      const result = await categoriaService.getCategorias(filters);
      
      res.json({
        success: true,
        data: {
          categorias: result.categorias,
          pagination: result.pagination
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener categoría por ID
  async getCategoriaById(req, res) {
    try {
      const { id } = req.params;
      
      const result = await categoriaService.getCategoriaById(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json({
        success: true,
        data: { categoria: result.categoria }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Crear nueva categoría
  async createCategoria(req, res) {
    try {
      const result = await categoriaService.createCategoria(req.validatedData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json({
        success: true,
        message: result.message,
        data: { categoria: result.categoria }
      });
      
    } catch (error) {
      console.error('❌ Error creando categoría:', error);
      
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
  
  // Actualizar categoría
  async updateCategoria(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar que la categoría existe
      const categoriaCheck = await categoriaService.getCategoriaById(id);
      if (!categoriaCheck.success) {
        return res.status(404).json(categoriaCheck);
      }
      
      const result = await categoriaService.updateCategoria(id, req.validatedData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json({
        success: true,
        message: result.message,
        data: { categoria: result.categoria }
      });
      
    } catch (error) {
      console.error('❌ Error actualizando categoría:', error);
      
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
  
  // Eliminar categoría (soft delete)
  async deleteCategoria(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar que la categoría existe
      const categoriaCheck = await categoriaService.getCategoriaById(id);
      if (!categoriaCheck.success) {
        return res.status(404).json(categoriaCheck);
      }
      
      const result = await categoriaService.deleteCategoria(id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error eliminando categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Restaurar categoría
  async restoreCategoria(req, res) {
    try {
      const { id } = req.params;
      
      const result = await categoriaService.restoreCategoria(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error restaurando categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener estadísticas de categorías
  async getEstadisticas(req, res) {
    try {
      const result = await categoriaService.getEstadisticas();
      
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
  
  // Buscar categorías para autocompletado
  async searchCategorias(req, res) {
    try {
      const { q, limit = 10 } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.json({
          success: true,
          data: { categorias: [] }
        });
      }
      
      const result = await categoriaService.searchCategorias(q.trim(), limit);
      
      res.json({
        success: true,
        data: { categorias: result.categorias }
      });
      
    } catch (error) {
      console.error('❌ Error buscando categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener categorías activas (sin paginación para selects)
  async getCategoriasActivas(req, res) {
    try {
      const result = await categoriaService.getCategoriasActivas();
      
      res.json({
        success: true,
        data: { categorias: result.categorias }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo categorías activas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new CategoriaController();