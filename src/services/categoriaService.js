const { Categoria, Servicio, sequelize } = require('../models'); // ✅ Agregar sequelize aquí
const { Op } = require('sequelize');

class CategoriaService {
  
  // Obtener todas las categorías con paginación y filtros
  async getCategorias(filters = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '',
        estado = ''
      } = filters;
      
      const offset = (page - 1) * limit;
      
      // Construir condiciones de búsqueda
      const whereConditions = {};
      
      if (search) {
        whereConditions[Op.or] = [
          { nombre: { [Op.like]: `%${search}%` } },
          { descripcion: { [Op.like]: `%${search}%` } }
        ];
      }
      
      if (estado) {
        whereConditions.estado = estado;
      }
      
      const result = await Categoria.findAndCountAll({
        where: whereConditions,
        include: [{
          model: Servicio,
          as: 'servicios',
          attributes: ['servicios_id', 'nombre', 'estado'],
          required: false
        }],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      const totalPages = Math.ceil(result.count / limit);
      
      return {
        success: true,
        categorias: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: result.count,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
      
    } catch (error) {
      console.error('❌ Error en categoriaService.getCategorias:', error);
      throw error;
    }
  }
  
  // Obtener categoría por ID
  async getCategoriaById(id) {
    try {
      const categoria = await Categoria.findByPk(id, {
        include: [{
          model: Servicio,
          as: 'servicios',
          attributes: ['servicios_id', 'nombre', 'precio_minimo', 'precio_recomendado', 'estado'],
          required: false
        }]
      });
      
      if (!categoria) {
        return {
          success: false,
          message: 'Categoría no encontrada'
        };
      }
      
      return {
        success: true,
        categoria
      };
      
    } catch (error) {
      console.error('❌ Error en categoriaService.getCategoriaById:', error);
      throw error;
    }
  }
  
  // Crear nueva categoría
  async createCategoria(categoriaData) {
    try {
      // Verificar si el nombre ya existe (solo activas)
      const categoriaExistente = await Categoria.findOne({
        where: { 
          nombre: {
            [Op.like]: categoriaData.nombre.trim()
          },
          estado: 'activo'
        }
      });
      
      if (categoriaExistente) {
        return {
          success: false,
          message: 'Ya existe una categoría activa con ese nombre'
        };
      }
      
      const nuevaCategoria = await Categoria.create({
        nombre: categoriaData.nombre.trim(),
        descripcion: categoriaData.descripcion?.trim() || null,
        estado: 'activo'
      });
      
      return {
        success: true,
        categoria: nuevaCategoria,
        message: 'Categoría creada exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en categoriaService.createCategoria:', error);
      throw error;
    }
  }
  
  // Actualizar categoría
  async updateCategoria(id, categoriaData) {
    try {
      const categoria = await Categoria.findByPk(id);
      
      if (!categoria) {
        return {
          success: false,
          message: 'Categoría no encontrada'
        };
      }
      
      // Si se está actualizando el nombre, verificar que no exista (solo activas)
      if (categoriaData.nombre && categoriaData.nombre.trim() !== categoria.nombre) {
        const categoriaExistente = await Categoria.findOne({
          where: { 
            nombre: {
              [Op.like]: categoriaData.nombre.trim()
            },
            categorias_id: { [Op.ne]: id },
            estado: 'activo'
          }
        });
        
        if (categoriaExistente) {
          return {
            success: false,
            message: 'Ya existe una categoría activa con ese nombre'
          };
        }
      }
      
      // Preparar datos para actualizar
      const datosActualizacion = {};
      
      if (categoriaData.nombre) {
        datosActualizacion.nombre = categoriaData.nombre.trim();
      }
      
      if (categoriaData.descripcion !== undefined) {
        datosActualizacion.descripcion = categoriaData.descripcion?.trim() || null;
      }
      
      if (categoriaData.estado) {
        datosActualizacion.estado = categoriaData.estado;
      }
      
      await categoria.update(datosActualizacion);
      
      // Obtener categoría actualizada con relaciones
      const categoriaActualizada = await Categoria.findByPk(id, {
        include: [{
          model: Servicio,
          as: 'servicios',
          attributes: ['servicios_id', 'nombre', 'estado'],
          required: false
        }]
      });
      
      return {
        success: true,
        categoria: categoriaActualizada,
        message: 'Categoría actualizada exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en categoriaService.updateCategoria:', error);
      throw error;
    }
  }
  
  // Eliminar categoría (soft delete)
  async deleteCategoria(id) {
    try {
      const categoria = await Categoria.findByPk(id);
      
      if (!categoria) {
        return {
          success: false,
          message: 'Categoría no encontrada'
        };
      }
      
      // Verificar si tiene servicios activos asociados
      const serviciosActivos = await Servicio.count({
        where: { 
          categorias_id: id,
          estado: 'activo'
        }
      });
      
      if (serviciosActivos > 0) {
        return {
          success: false,
          message: `No se puede desactivar la categoría porque tiene ${serviciosActivos} servicio(s) activo(s) asociado(s)`
        };
      }
      
      await categoria.update({ estado: 'inactivo' });
      
      return {
        success: true,
        message: 'Categoría desactivada exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en categoriaService.deleteCategoria:', error);
      throw error;
    }
  }
  
  // Restaurar categoría
  async restoreCategoria(id) {
    try {
      const categoria = await Categoria.findByPk(id);
      
      if (!categoria) {
        return {
          success: false,
          message: 'Categoría no encontrada'
        };
      }
      
      // Verificar si ya existe una categoría activa con el mismo nombre
      const categoriaExistente = await Categoria.findOne({
        where: { 
          nombre: {
            [Op.like]: categoria.nombre
          },
          categorias_id: { [Op.ne]: id },
          estado: 'activo'
        }
      });
      
      if (categoriaExistente) {
        return {
          success: false,
          message: 'Ya existe una categoría activa con ese nombre'
        };
      }
      
      await categoria.update({ estado: 'activo' });
      
      return {
        success: true,
        message: 'Categoría restaurada exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en categoriaService.restoreCategoria:', error);
      throw error;
    }
  }
  
  // ✅ MÉTODO CORREGIDO: Obtener estadísticas de categorías
  async getEstadisticas() {
    try {
      console.log('📊 Iniciando cálculo de estadísticas...');
      
      // Estadísticas básicas
      const [total, activas, inactivas] = await Promise.all([
        Categoria.count(),
        Categoria.count({ where: { estado: 'activo' } }),
        Categoria.count({ where: { estado: 'inactivo' } })
      ]);
      
      console.log(`📊 Conteos básicos - Total: ${total}, Activas: ${activas}, Inactivas: ${inactivas}`);
      
      // Categorías activas con servicios activos (usando consulta SQL directa)
      const [conServiciosResult] = await sequelize.query(`
        SELECT COUNT(DISTINCT c.categorias_id) as count
        FROM categorias c
        INNER JOIN servicios s ON c.categorias_id = s.categorias_id
        WHERE c.estado = 'activo' AND s.estado = 'activo'
      `, {
        type: sequelize.QueryTypes.SELECT
      });
      
      const conServiciosActivos = parseInt(conServiciosResult.count) || 0;
      const sinServiciosActivos = activas - conServiciosActivos;
      
      console.log(`📊 Servicios - Con servicios: ${conServiciosActivos}, Sin servicios: ${sinServiciosActivos}`);
      
      // Categorías con más servicios (consulta SQL directa)
      const categoriasMasServicios = await sequelize.query(`
        SELECT 
          c.categorias_id,
          c.nombre,
          COUNT(s.servicios_id) as total_servicios_activos
        FROM categorias c
        LEFT JOIN servicios s ON c.categorias_id = s.categorias_id AND s.estado = 'activo'
        WHERE c.estado = 'activo'
        GROUP BY c.categorias_id, c.nombre
        ORDER BY total_servicios_activos DESC
        LIMIT 10
      `, {
        type: sequelize.QueryTypes.SELECT
      });
      
      const estadisticas = {
        total,
        activas,
        inactivas,
        con_servicios_activos: conServiciosActivos,
        sin_servicios_activos: sinServiciosActivos,
        mas_servicios: categoriasMasServicios,
        porcentajes: {
          activas: total > 0 ? Math.round((activas / total) * 100) : 0,
          inactivas: total > 0 ? Math.round((inactivas / total) * 100) : 0,
          con_servicios: activas > 0 ? Math.round((conServiciosActivos / activas) * 100) : 0,
          sin_servicios: activas > 0 ? Math.round((sinServiciosActivos / activas) * 100) : 0
        }
      };
      
      console.log('✅ Estadísticas calculadas exitosamente:', estadisticas);
      
      return {
        success: true,
        estadisticas
      };
      
    } catch (error) {
      console.error('❌ Error en categoriaService.getEstadisticas:', error);
      throw error;
    }
  }
  
  // Buscar categorías para autocompletado (solo activas)
  async searchCategorias(searchTerm, limit = 10) {
    try {
      const categorias = await Categoria.findAll({
        where: {
          [Op.and]: [
            { estado: 'activo' },
            {
              [Op.or]: [
                { nombre: { [Op.like]: `%${searchTerm}%` } },
                { descripcion: { [Op.like]: `%${searchTerm}%` } }
              ]
            }
          ]
        },
        attributes: [
          'categorias_id',
          'nombre',
          'descripcion'
        ],
        limit: parseInt(limit),
        order: [['nombre', 'ASC']]
      });
      
      return {
        success: true,
        categorias
      };
      
    } catch (error) {
      console.error('❌ Error en categoriaService.searchCategorias:', error);
      throw error;
    }
  }
  
  // Obtener categorías activas (para selects)
  async getCategoriasActivas() {
    try {
      const categorias = await Categoria.findAll({
        where: { estado: 'activo' },
        attributes: [
          'categorias_id',
          'nombre',
          'descripcion'
        ],
        order: [['nombre', 'ASC']]
      });
      
      return {
        success: true,
        categorias
      };
      
    } catch (error) {
      console.error('❌ Error en categoriaService.getCategoriasActivas:', error);
      throw error;
    }
  }
}

module.exports = new CategoriaService();