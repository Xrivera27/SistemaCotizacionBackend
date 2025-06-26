const { Categoria, Servicio, sequelize } = require('../models');
const { Op } = require('sequelize');

class ServicioService {
  
  // Obtener todos los servicios con paginación y filtros
  async getServicios(filters = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '',
        estado = '',
        categoria_id = ''
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
      
      if (categoria_id) {
        whereConditions.categorias_id = categoria_id;
      }
      
      const result = await Servicio.findAndCountAll({
        where: whereConditions,
        include: [{
          model: Categoria,
          as: 'categoria',
          attributes: ['categorias_id', 'nombre', 'estado'],
          required: false
        }],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      const totalPages = Math.ceil(result.count / limit);
      
      return {
        success: true,
        servicios: result.rows,
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
      console.error('❌ Error en servicioService.getServicios:', error);
      throw error;
    }
  }
  
  // Obtener servicio por ID
  async getServicioById(id) {
    try {
      const servicio = await Servicio.findByPk(id, {
        include: [{
          model: Categoria,
          as: 'categoria',
          attributes: ['categorias_id', 'nombre', 'descripcion', 'estado'],
          required: false
        }]
      });
      
      if (!servicio) {
        return {
          success: false,
          message: 'Servicio no encontrado'
        };
      }
      
      return {
        success: true,
        servicio
      };
      
    } catch (error) {
      console.error('❌ Error en servicioService.getServicioById:', error);
      throw error;
    }
  }
  
  // Crear nuevo servicio
  async createServicio(servicioData) {
    try {
      // Verificar si el nombre ya existe en la misma categoría (solo activos)
      const servicioExistente = await Servicio.findOne({
        where: { 
          nombre: {
            [Op.like]: servicioData.nombre.trim()
          },
          categorias_id: servicioData.categorias_id,
          estado: 'activo'
        }
      });
      
      if (servicioExistente) {
        return {
          success: false,
          message: 'Ya existe un servicio activo con ese nombre en esta categoría'
        };
      }
      
      // Verificar que la categoría existe y está activa
      const categoria = await Categoria.findOne({
        where: {
          categorias_id: servicioData.categorias_id,
          estado: 'activo'
        }
      });
      
      if (!categoria) {
        return {
          success: false,
          message: 'La categoría seleccionada no existe o no está activa'
        };
      }
      
      // Validar precios
      if (parseFloat(servicioData.precio_minimo) < 0) {
        return {
          success: false,
          message: 'El precio mínimo no puede ser negativo'
        };
      }
      
      if (parseFloat(servicioData.precio_recomendado) < parseFloat(servicioData.precio_minimo)) {
        return {
          success: false,
          message: 'El precio recomendado no puede ser menor al precio mínimo'
        };
      }
      
      const nuevoServicio = await Servicio.create({
        nombre: servicioData.nombre.trim(),
        descripcion: servicioData.descripcion?.trim() || null,
        categorias_id: servicioData.categorias_id,
        precio_minimo: parseFloat(servicioData.precio_minimo),
        precio_recomendado: parseFloat(servicioData.precio_recomendado),
        estado: 'activo'
      });
      
      // Obtener el servicio con la categoría incluida
      const servicioConCategoria = await Servicio.findByPk(nuevoServicio.servicios_id, {
        include: [{
          model: Categoria,
          as: 'categoria',
          attributes: ['categorias_id', 'nombre', 'estado']
        }]
      });
      
      return {
        success: true,
        servicio: servicioConCategoria,
        message: 'Servicio creado exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en servicioService.createServicio:', error);
      throw error;
    }
  }
  
  // Actualizar servicio
  async updateServicio(id, servicioData) {
    try {
      const servicio = await Servicio.findByPk(id);
      
      if (!servicio) {
        return {
          success: false,
          message: 'Servicio no encontrado'
        };
      }
      
      // Si se está actualizando el nombre o categoría, verificar que no exista (solo activos)
      if ((servicioData.nombre && servicioData.nombre.trim() !== servicio.nombre) || 
          (servicioData.categorias_id && servicioData.categorias_id !== servicio.categorias_id)) {
        
        const nombreAVerificar = servicioData.nombre ? servicioData.nombre.trim() : servicio.nombre;
        const categoriaAVerificar = servicioData.categorias_id ? servicioData.categorias_id : servicio.categorias_id;
        
        const servicioExistente = await Servicio.findOne({
          where: { 
            nombre: {
              [Op.like]: nombreAVerificar
            },
            categorias_id: categoriaAVerificar,
            servicios_id: { [Op.ne]: id },
            estado: 'activo'
          }
        });
        
        if (servicioExistente) {
          return {
            success: false,
            message: 'Ya existe un servicio activo con ese nombre en esta categoría'
          };
        }
      }
      
      // Si se está cambiando la categoría, verificar que existe y está activa
      if (servicioData.categorias_id && servicioData.categorias_id !== servicio.categorias_id) {
        const categoria = await Categoria.findOne({
          where: {
            categorias_id: servicioData.categorias_id,
            estado: 'activo'
          }
        });
        
        if (!categoria) {
          return {
            success: false,
            message: 'La categoría seleccionada no existe o no está activa'
          };
        }
      }
      
      // Preparar datos para actualizar
      const datosActualizacion = {};
      
      if (servicioData.nombre) {
        datosActualizacion.nombre = servicioData.nombre.trim();
      }
      
      if (servicioData.descripcion !== undefined) {
        datosActualizacion.descripcion = servicioData.descripcion?.trim() || null;
      }
      
      if (servicioData.categorias_id) {
        datosActualizacion.categorias_id = servicioData.categorias_id;
      }
      
      if (servicioData.precio_minimo !== undefined) {
        if (parseFloat(servicioData.precio_minimo) < 0) {
          return {
            success: false,
            message: 'El precio mínimo no puede ser negativo'
          };
        }
        datosActualizacion.precio_minimo = parseFloat(servicioData.precio_minimo);
      }
      
      if (servicioData.precio_recomendado !== undefined) {
        const precioMinimo = servicioData.precio_minimo !== undefined ? 
          parseFloat(servicioData.precio_minimo) : servicio.precio_minimo;
        
        if (parseFloat(servicioData.precio_recomendado) < precioMinimo) {
          return {
            success: false,
            message: 'El precio recomendado no puede ser menor al precio mínimo'
          };
        }
        datosActualizacion.precio_recomendado = parseFloat(servicioData.precio_recomendado);
      }
      
      if (servicioData.estado) {
        datosActualizacion.estado = servicioData.estado;
      }
      
      await servicio.update(datosActualizacion);
      
      // Obtener servicio actualizado con relaciones
      const servicioActualizado = await Servicio.findByPk(id, {
        include: [{
          model: Categoria,
          as: 'categoria',
          attributes: ['categorias_id', 'nombre', 'estado']
        }]
      });
      
      return {
        success: true,
        servicio: servicioActualizado,
        message: 'Servicio actualizado exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en servicioService.updateServicio:', error);
      throw error;
    }
  }
  
  // Eliminar servicio (soft delete)
  async deleteServicio(id) {
    try {
      const servicio = await Servicio.findByPk(id);
      
      if (!servicio) {
        return {
          success: false,
          message: 'Servicio no encontrado'
        };
      }
      
      // Verificar si tiene cotizaciones asociadas (aquí puedes agregar validación de cotizaciones si aplica)
      // const cotizacionesActivas = await CotizacionDetalle.count({
      //   where: { 
      //     servicios_id: id,
      //     // otras condiciones según tu lógica
      //   }
      // });
      
      // if (cotizacionesActivas > 0) {
      //   return {
      //     success: false,
      //     message: `No se puede desactivar el servicio porque tiene cotizaciones activas asociadas`
      //   };
      // }
      
      await servicio.update({ estado: 'inactivo' });
      
      return {
        success: true,
        message: 'Servicio desactivado exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en servicioService.deleteServicio:', error);
      throw error;
    }
  }
  
  // Restaurar servicio
  async restoreServicio(id) {
    try {
      const servicio = await Servicio.findByPk(id);
      
      if (!servicio) {
        return {
          success: false,
          message: 'Servicio no encontrado'
        };
      }
      
      // Verificar si ya existe un servicio activo con el mismo nombre en la misma categoría
      const servicioExistente = await Servicio.findOne({
        where: { 
          nombre: {
            [Op.like]: servicio.nombre
          },
          categorias_id: servicio.categorias_id,
          servicios_id: { [Op.ne]: id },
          estado: 'activo'
        }
      });
      
      if (servicioExistente) {
        return {
          success: false,
          message: 'Ya existe un servicio activo con ese nombre en esta categoría'
        };
      }
      
      // Verificar que la categoría esté activa
      const categoria = await Categoria.findOne({
        where: {
          categorias_id: servicio.categorias_id,
          estado: 'activo'
        }
      });
      
      if (!categoria) {
        return {
          success: false,
          message: 'No se puede activar el servicio porque su categoría no está activa'
        };
      }
      
      await servicio.update({ estado: 'activo' });
      
      return {
        success: true,
        message: 'Servicio restaurado exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en servicioService.restoreServicio:', error);
      throw error;
    }
  }
  
  // Obtener estadísticas de servicios
  async getEstadisticas() {
    try {
      console.log('📊 Iniciando cálculo de estadísticas de servicios...');
      
      // Estadísticas básicas
      const [total, activos, inactivos] = await Promise.all([
        Servicio.count(),
        Servicio.count({ where: { estado: 'activo' } }),
        Servicio.count({ where: { estado: 'inactivo' } })
      ]);
      
      console.log(`📊 Conteos básicos - Total: ${total}, Activos: ${activos}, Inactivos: ${inactivos}`);
      
      // Servicios por rango de precio
      const [barato, medio, caro] = await Promise.all([
        Servicio.count({ 
          where: { 
            estado: 'activo',
            precio_recomendado: { [Op.lt]: 1000 }
          }
        }),
        Servicio.count({ 
          where: { 
            estado: 'activo',
            precio_recomendado: { [Op.between]: [1000, 5000] }
          }
        }),
        Servicio.count({ 
          where: { 
            estado: 'activo',
            precio_recomendado: { [Op.gt]: 5000 }
          }
        })
      ]);
      
      // Precio promedio de servicios activos
      const [precioPromedioResult] = await sequelize.query(`
        SELECT 
          AVG(precio_recomendado) as precio_promedio,
          MIN(precio_recomendado) as precio_minimo,
          MAX(precio_recomendado) as precio_maximo
        FROM servicios 
        WHERE estado = 'activo'
      `, {
        type: sequelize.QueryTypes.SELECT
      });
      
      // Servicios por categoría
      const serviciosPorCategoria = await sequelize.query(`
        SELECT 
          c.nombre as categoria_nombre,
          COUNT(s.servicios_id) as total_servicios
        FROM categorias c
        LEFT JOIN servicios s ON c.categorias_id = s.categorias_id AND s.estado = 'activo'
        WHERE c.estado = 'activo'
        GROUP BY c.categorias_id, c.nombre
        ORDER BY total_servicios DESC
        LIMIT 10
      `, {
        type: sequelize.QueryTypes.SELECT
      });
      
      const estadisticas = {
        total,
        activos,
        inactivos,
        rangos_precio: {
          barato, // < 1000
          medio,  // 1000-5000
          caro    // > 5000
        },
        precios: {
          promedio: parseFloat(precioPromedioResult?.precio_promedio || 0).toFixed(2),
          minimo: parseFloat(precioPromedioResult?.precio_minimo || 0).toFixed(2),
          maximo: parseFloat(precioPromedioResult?.precio_maximo || 0).toFixed(2)
        },
        por_categoria: serviciosPorCategoria,
        porcentajes: {
          activos: total > 0 ? Math.round((activos / total) * 100) : 0,
          inactivos: total > 0 ? Math.round((inactivos / total) * 100) : 0,
          barato: activos > 0 ? Math.round((barato / activos) * 100) : 0,
          medio: activos > 0 ? Math.round((medio / activos) * 100) : 0,
          caro: activos > 0 ? Math.round((caro / activos) * 100) : 0
        }
      };
      
      console.log('✅ Estadísticas de servicios calculadas exitosamente:', estadisticas);
      
      return {
        success: true,
        estadisticas
      };
      
    } catch (error) {
      console.error('❌ Error en servicioService.getEstadisticas:', error);
      throw error;
    }
  }
  
  // Buscar servicios para autocompletado (solo activos)
  async searchServicios(searchTerm, limit = 10) {
    try {
      const servicios = await Servicio.findAll({
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
        include: [{
          model: Categoria,
          as: 'categoria',
          attributes: ['nombre'],
          required: false
        }],
        attributes: [
          'servicios_id',
          'nombre',
          'descripcion',
          'precio_recomendado'
        ],
        limit: parseInt(limit),
        order: [['nombre', 'ASC']]
      });
      
      return {
        success: true,
        servicios
      };
      
    } catch (error) {
      console.error('❌ Error en servicioService.searchServicios:', error);
      throw error;
    }
  }
  
  // Obtener servicios activos (para selects)
  async getServiciosActivos() {
    try {
      const servicios = await Servicio.findAll({
        where: { estado: 'activo' },
        include: [{
          model: Categoria,
          as: 'categoria',
          attributes: ['nombre'],
          required: false
        }],
        attributes: [
          'servicios_id',
          'nombre',
          'descripcion',
          'precio_minimo',
          'precio_recomendado'
        ],
        order: [['nombre', 'ASC']]
      });
      
      return {
        success: true,
        servicios
      };
      
    } catch (error) {
      console.error('❌ Error en servicioService.getServiciosActivos:', error);
      throw error;
    }
  }
  
  // Obtener servicios por categoría
  async getServiciosPorCategoria(categoriaId) {
    try {
      const servicios = await Servicio.findAll({
        where: { 
          categorias_id: categoriaId,
          estado: 'activo' 
        },
        attributes: [
          'servicios_id',
          'nombre',
          'descripcion',
          'precio_minimo',
          'precio_recomendado'
        ],
        order: [['nombre', 'ASC']]
      });
      
      return {
        success: true,
        servicios
      };
      
    } catch (error) {
      console.error('❌ Error en servicioService.getServiciosPorCategoria:', error);
      throw error;
    }
  }
}

module.exports = new ServicioService();