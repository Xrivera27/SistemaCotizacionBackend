const categoriaService = require('../services/categoriaService');

class CategoriaController {
  
  // Obtener todas las categorías con paginación y filtros
  async getCategorias(req, res) {
    try {
      console.log('=== GET CATEGORIAS ===');
      console.log('Query params:', req.query);
      console.log('Usuario:', req.user);
      
      const filters = { ...req.query };
      
      const result = await categoriaService.getCategorias(filters);
      
      console.log(`✅ Categorías encontradas: ${result.pagination.totalItems}`);
      
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
      console.log('=== GET CATEGORIA BY ID ===');
      const { id } = req.params;
      console.log('ID solicitado:', id);
      
      const result = await categoriaService.getCategoriaById(id);
      
      if (!result.success) {
        console.log('❌ Categoría no encontrada');
        return res.status(404).json(result);
      }
      
      console.log('✅ Categoría encontrada:', result.categoria.nombre);
      
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
      console.log('=== CREATE CATEGORIA ===');
      console.log('Datos recibidos:', req.validatedData);
      console.log('Usuario creador:', req.user);
      
      const result = await categoriaService.createCategoria(req.validatedData);
      
      if (!result.success) {
        console.log('❌ Error creando categoría:', result.message);
        return res.status(400).json(result);
      }
      
      console.log('✅ Categoría creada exitosamente:', result.categoria.nombre);
      
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
      console.log('=== UPDATE CATEGORIA ===');
      const { id } = req.params;
      console.log('ID a actualizar:', id);
      console.log('Datos recibidos:', req.validatedData);
      
      // Verificar que la categoría existe
      const categoriaCheck = await categoriaService.getCategoriaById(id);
      if (!categoriaCheck.success) {
        return res.status(404).json(categoriaCheck);
      }
      
      const result = await categoriaService.updateCategoria(id, req.validatedData);
      
      if (!result.success) {
        console.log('❌ Error actualizando categoría:', result.message);
        return res.status(400).json(result);
      }
      
      console.log('✅ Categoría actualizada exitosamente');
      
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
      console.log('=== DELETE CATEGORIA ===');
      const { id } = req.params;
      console.log('ID a eliminar:', id);
      
      // Verificar que la categoría existe
      const categoriaCheck = await categoriaService.getCategoriaById(id);
      if (!categoriaCheck.success) {
        return res.status(404).json(categoriaCheck);
      }
      
      const result = await categoriaService.deleteCategoria(id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      console.log('✅ Categoría eliminada exitosamente');
      
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
      console.log('=== RESTORE CATEGORIA ===');
      const { id } = req.params;
      console.log('ID a restaurar:', id);
      
      const result = await categoriaService.restoreCategoria(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      console.log('✅ Categoría restaurada exitosamente');
      
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
      console.log('=== GET ESTADISTICAS CATEGORIAS ===');
      
      const result = await categoriaService.getEstadisticas();
      
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
  
  // Buscar categorías para autocompletado
  async searchCategorias(req, res) {
    try {
      console.log('=== SEARCH CATEGORIAS ===');
      const { q, limit = 10 } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.json({
          success: true,
          data: { categorias: [] }
        });
      }
      
      const result = await categoriaService.searchCategorias(q.trim(), limit);
      
      console.log(`✅ Categorías encontradas para búsqueda: ${result.categorias.length}`);
      
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
      console.log('=== GET CATEGORIAS ACTIVAS ===');
      
      const result = await categoriaService.getCategoriasActivas();
      
      console.log(`✅ Categorías activas encontradas: ${result.categorias.length}`);
      
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