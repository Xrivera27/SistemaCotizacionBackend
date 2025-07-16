const { Categoria, Servicio, UnidadMedida, sequelize } = require('../models');
const { Op } = require('sequelize');

class ServicioService {
  
  // 🔧 CORREGIDO: Obtener todos los servicios con paginación y filtros (con múltiples categorías)
  async getServicios(filters = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '',
        estado = '',
        categoria_id = '',
        rango_precio = ''
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
      
      // 🆕 NUEVO: Filtro por categoría usando JSON_CONTAINS para múltiples categorías
      if (categoria_id) {
        // Buscar tanto en categorias_id (compatibilidad) como en categorias_ids (nuevo)
        whereConditions[Op.or] = [
          { categorias_id: categoria_id },
          sequelize.where(
            sequelize.fn('JSON_CONTAINS', 
              sequelize.col('categorias_ids'), 
              `"${categoria_id}"`
            ), 
            true
          )
        ];
      }
      
      // 🆕 NUEVO: Filtro por rango de precio
      if (rango_precio) {
        switch (rango_precio) {
          case 'bajo':
            whereConditions.precio_recomendado = { [Op.lt]: 500 };
            break;
          case 'medio':
            whereConditions.precio_recomendado = { [Op.between]: [500, 2000] };
            break;
          case 'alto':
            whereConditions.precio_recomendado = { [Op.gt]: 2000 };
            break;
        }
      }
      
      const result = await Servicio.findAndCountAll({
        where: whereConditions,
        include: [{
          model: Categoria,
          as: 'categoria',
          attributes: ['categorias_id', 'nombre', 'estado', 'unidades_medida_id'],
          include: [{
            model: UnidadMedida,
            as: 'unidad_medida',
            attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo', 'descripcion']
          }],
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
  
  // 🔧 CORREGIDO: Obtener servicio por ID (con múltiples categorías)
  async getServicioById(id) {
    try {
      const servicio = await Servicio.findByPk(id, {
        include: [{
          model: Categoria,
          as: 'categoria',
          attributes: ['categorias_id', 'nombre', 'descripcion', 'estado', 'unidades_medida_id'],
          include: [{
            model: UnidadMedida,
            as: 'unidad_medida',
            attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo', 'descripcion']
          }],
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
  
  // 🔧 CORREGIDO: Crear nuevo servicio (con múltiples categorías)
  async createServicio(servicioData) {
  try {
    const { categorias, categoria_principal, ...otrosDatos } = servicioData;
    
    // 🆕 NUEVO: Manejar múltiples categorías
    let categoriasArray = [];
    let categoriaPrincipal = null;
    
    if (categorias && Array.isArray(categorias) && categorias.length > 0) {
      categoriasArray = categorias;
      categoriaPrincipal = categoria_principal || categorias[0];
    } else if (servicioData.categorias_id) {
      // Compatibilidad con estructura antigua
      categoriasArray = [servicioData.categorias_id];
      categoriaPrincipal = servicioData.categorias_id;
    } else {
      return {
        success: false,
        message: 'Debe seleccionar al menos una categoría'
      };
    }
    
    // Verificar que todas las categorías existen
    const categoriasExistentes = await Categoria.count({
      where: {
        categorias_id: { [Op.in]: categoriasArray }
      }
    });
    
    if (categoriasExistentes !== categoriasArray.length) {
      return {
        success: false,
        message: 'Una o más categorías seleccionadas no existen'
      };
    }
    
    // 🆕 NUEVO: Verificar si el nombre ya existe (considerando múltiples categorías)
    const servicioExistente = await Servicio.findOne({
      where: { 
        nombre: {
          [Op.like]: otrosDatos.nombre.trim()
        },
        estado: 'activo',
        [Op.or]: [
          { categorias_id: { [Op.in]: categoriasArray } },
          ...categoriasArray.map(catId => 
            sequelize.where(
              sequelize.fn('JSON_CONTAINS', 
                sequelize.col('categorias_ids'), 
                `"${catId}"`
              ), 
              true
            )
          )
        ]
      }
    });
    
    if (servicioExistente) {
      return {
        success: false,
        message: 'Ya existe un servicio activo con ese nombre en una de las categorías seleccionadas'
      };
    }
    
    // Validar precios
    if (parseFloat(otrosDatos.precio_minimo) < 0) {
      return {
        success: false,
        message: 'El precio mínimo no puede ser negativo'
      };
    }
    
    if (parseFloat(otrosDatos.precio_recomendado) < parseFloat(otrosDatos.precio_minimo)) {
      return {
        success: false,
        message: 'El precio recomendado no puede ser menor al precio mínimo'
      };
    }
    
    // 🔧 CORREGIDO: CREAR SERVICIO con múltiples categorías
    console.log('📝 Creando servicio con datos:', {
      nombre: otrosDatos.nombre.trim(),
      categorias_id: categoriaPrincipal,
      categorias_ids: JSON.stringify(categoriasArray),
      categoriasArray: categoriasArray
    });
    
    const nuevoServicio = await Servicio.create({
      nombre: otrosDatos.nombre.trim(),
      descripcion: otrosDatos.descripcion?.trim() || null,
      categorias_id: categoriaPrincipal, // Mantener compatibilidad
      categorias_ids: JSON.stringify(categoriasArray), // 🔧 CORREGIDO: Asegurar JSON válido
      precio_minimo: parseFloat(otrosDatos.precio_minimo),
      precio_recomendado: parseFloat(otrosDatos.precio_recomendado),
      estado: 'activo'
    });
    
    console.log('✅ Servicio creado en BD:', {
      id: nuevoServicio.servicios_id,
      nombre: nuevoServicio.nombre,
      categorias_id: nuevoServicio.categorias_id,
      categorias_ids: nuevoServicio.categorias_ids
    });
    
    // Obtener el servicio con la categoría incluida
    const servicioConCategoria = await this.getServicioById(nuevoServicio.servicios_id);
    
    return {
      success: true,
      servicio: servicioConCategoria.servicio,
      message: 'Servicio creado exitosamente'
    };
    
  } catch (error) {
    console.error('❌ Error en servicioService.createServicio:', error);
    throw error;
  }
}
  
  // 🔧 CORREGIDO: Actualizar servicio (con múltiples categorías)
  async updateServicio(id, servicioData) {
    try {
      const { categorias, categoria_principal, ...otrosDatos } = servicioData;
      
      const servicio = await Servicio.findByPk(id);
      
      if (!servicio) {
        return {
          success: false,
          message: 'Servicio no encontrado'
        };
      }
      
      // Preparar datos para actualizar
      const datosActualizacion = {};
      
      if (otrosDatos.nombre) {
        datosActualizacion.nombre = otrosDatos.nombre.trim();
      }
      
      if (otrosDatos.descripcion !== undefined) {
        datosActualizacion.descripcion = otrosDatos.descripcion?.trim() || null;
      }
      
      if (otrosDatos.precio_minimo !== undefined) {
        if (parseFloat(otrosDatos.precio_minimo) < 0) {
          return {
            success: false,
            message: 'El precio mínimo no puede ser negativo'
          };
        }
        datosActualizacion.precio_minimo = parseFloat(otrosDatos.precio_minimo);
      }
      
      if (otrosDatos.precio_recomendado !== undefined) {
        const precioMinimo = otrosDatos.precio_minimo !== undefined ? 
          parseFloat(otrosDatos.precio_minimo) : servicio.precio_minimo;
        
        if (parseFloat(otrosDatos.precio_recomendado) < precioMinimo) {
          return {
            success: false,
            message: 'El precio recomendado no puede ser menor al precio mínimo'
          };
        }
        datosActualizacion.precio_recomendado = parseFloat(otrosDatos.precio_recomendado);
      }
      
      if (otrosDatos.estado) {
        datosActualizacion.estado = otrosDatos.estado;
      }
      
      // 🆕 NUEVO: Actualizar categorías si se proporcionan
      if (categorias && Array.isArray(categorias) && categorias.length > 0) {
        // Verificar que todas las categorías existen
        const categoriasExistentes = await Categoria.count({
          where: {
            categorias_id: { [Op.in]: categorias }
          }
        });
        
        if (categoriasExistentes !== categorias.length) {
          return {
            success: false,
            message: 'Una o más categorías seleccionadas no existen'
          };
        }
        
        const categoriaPrincipal = categoria_principal || categorias[0];
        
        datosActualizacion.categorias_id = categoriaPrincipal; // Mantener compatibilidad
        datosActualizacion.categorias_ids = JSON.stringify(categorias); // 🆕 Múltiples
      }
      
      // 🆕 NUEVO: Verificar duplicados si se actualiza nombre o categorías
      if ((datosActualizacion.nombre && datosActualizacion.nombre !== servicio.nombre) || 
          datosActualizacion.categorias_ids) {
        
        const nombreAVerificar = datosActualizacion.nombre || servicio.nombre;
        let categoriasAVerificar = [];
        
        try {
          if (datosActualizacion.categorias_ids) {
            categoriasAVerificar = JSON.parse(datosActualizacion.categorias_ids);
          } else if (servicio.categorias_ids) {
            categoriasAVerificar = JSON.parse(servicio.categorias_ids);
          } else {
            categoriasAVerificar = [servicio.categorias_id];
          }
        } catch (error) {
          categoriasAVerificar = [servicio.categorias_id];
        }
        
        const servicioExistente = await Servicio.findOne({
          where: { 
            nombre: {
              [Op.like]: nombreAVerificar
            },
            servicios_id: { [Op.ne]: id },
            estado: 'activo',
            [Op.or]: [
              { categorias_id: { [Op.in]: categoriasAVerificar } },
              ...categoriasAVerificar.map(catId => 
                sequelize.where(
                  sequelize.fn('JSON_CONTAINS', 
                    sequelize.col('categorias_ids'), 
                    `"${catId}"`
                  ), 
                  true
                )
              )
            ]
          }
        });
        
        if (servicioExistente) {
          return {
            success: false,
            message: 'Ya existe un servicio activo con ese nombre en una de las categorías seleccionadas'
          };
        }
      }
      
      await servicio.update(datosActualizacion);
      
      // Obtener servicio actualizado con relaciones
      const servicioActualizado = await this.getServicioById(id);
      
      return {
        success: true,
        servicio: servicioActualizado.servicio,
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
  
  // 🔧 CORREGIDO: Restaurar servicio (considerando múltiples categorías)
  async restoreServicio(id) {
    try {
      const servicio = await Servicio.findByPk(id);
      
      if (!servicio) {
        return {
          success: false,
          message: 'Servicio no encontrado'
        };
      }
      
      // 🆕 NUEVO: Obtener categorías del servicio
      let categoriasServicio = [];
      try {
        if (servicio.categorias_ids) {
          categoriasServicio = JSON.parse(servicio.categorias_ids);
        } else if (servicio.categorias_id) {
          categoriasServicio = [servicio.categorias_id];
        }
      } catch (error) {
        categoriasServicio = [servicio.categorias_id];
      }
      
      // Verificar si ya existe un servicio activo con el mismo nombre en alguna categoría
      const servicioExistente = await Servicio.findOne({
        where: { 
          nombre: {
            [Op.like]: servicio.nombre
          },
          servicios_id: { [Op.ne]: id },
          estado: 'activo',
          [Op.or]: [
            { categorias_id: { [Op.in]: categoriasServicio } },
            ...categoriasServicio.map(catId => 
              sequelize.where(
                sequelize.fn('JSON_CONTAINS', 
                  sequelize.col('categorias_ids'), 
                  `"${catId}"`
                ), 
                true
              )
            )
          ]
        }
      });
      
      if (servicioExistente) {
        return {
          success: false,
          message: 'Ya existe un servicio activo con ese nombre en una de las categorías'
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
            precio_recomendado: { [Op.lt]: 500 }
          }
        }),
        Servicio.count({ 
          where: { 
            estado: 'activo',
            precio_recomendado: { [Op.between]: [500, 2000] }
          }
        }),
        Servicio.count({ 
          where: { 
            estado: 'activo',
            precio_recomendado: { [Op.gt]: 2000 }
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
      
      // 🔧 CORREGIDO: Servicios por categoría (considerando múltiples categorías)
      const serviciosPorCategoria = await sequelize.query(`
        SELECT 
          c.nombre as categoria_nombre,
          COUNT(DISTINCT s.servicios_id) as total_servicios
        FROM categorias c
        LEFT JOIN servicios s ON (
          (c.categorias_id = s.categorias_id AND s.estado = 'activo') OR
          (JSON_CONTAINS(s.categorias_ids, CONCAT('"', c.categorias_id, '"')) AND s.estado = 'activo')
        )
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
          barato, // < 500
          medio,  // 500-2000
          caro    // > 2000
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
          attributes: ['nombre', 'unidades_medida_id'],
          include: [{
            model: UnidadMedida,
            as: 'unidad_medida',
            attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo', 'descripcion']
          }],
          required: false
        }],
        attributes: [
          'servicios_id',
          'nombre',
          'descripcion',
          'precio_recomendado',
          'categorias_ids'
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
          attributes: ['nombre', 'unidades_medida_id'],
          include: [{
            model: UnidadMedida,
            as: 'unidad_medida',
            attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo', 'descripcion']
          }],
          required: false
        }],
        attributes: [
          'servicios_id',
          'nombre',
          'descripcion',
          'precio_minimo',
          'precio_recomendado',
          'categorias_ids'
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
  
  // 🔧 CORREGIDO: Obtener servicios por categoría (considerando múltiples categorías)
  async getServiciosPorCategoria(categoriaId) {
    try {
      const servicios = await Servicio.findAll({
        where: { 
          estado: 'activo',
          [Op.or]: [
            { categorias_id: categoriaId },
            sequelize.where(
              sequelize.fn('JSON_CONTAINS', 
                sequelize.col('categorias_ids'), 
                `"${categoriaId}"`
              ), 
              true
            )
          ]
        },
        include: [{
          model: Categoria,
          as: 'categoria',
          attributes: ['nombre', 'unidades_medida_id'],
          include: [{
            model: UnidadMedida,
            as: 'unidad_medida',
            attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo', 'descripcion']
          }],
          required: false
        }],
        attributes: [
          'servicios_id',
          'nombre',
          'descripcion',
          'precio_minimo',
          'precio_recomendado',
          'categorias_ids'
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

  // 🆕 NUEVO: Método para obtener todas las categorías de un servicio
  async getCategoriesForServicio(servicioId) {
    try {
      const servicio = await Servicio.findByPk(servicioId);
      
      if (!servicio) {
        return { success: false, message: 'Servicio no encontrado' };
      }
      
      let categoriasIds = [];
      try {
        if (servicio.categorias_ids) {
          categoriasIds = JSON.parse(servicio.categorias_ids);
        } else if (servicio.categorias_id) {
          categoriasIds = [servicio.categorias_id];
        }
      } catch (error) {
        if (servicio.categorias_id) {
          categoriasIds = [servicio.categorias_id];
        }
      }
      
      if (categoriasIds.length === 0) {
        return { success: true, categorias: [] };
      }
      
      const categorias = await Categoria.findAll({
        where: {
          categorias_id: { [Op.in]: categoriasIds }
        },
        include: [{
          model: UnidadMedida,
          as: 'unidad_medida',
          attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo']
        }],
        order: [['nombre', 'ASC']]
      });
      
      return {
        success: true,
        categorias: categorias
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo categorías del servicio:', error);
      return {
        success: false,
        categorias: []
      };
    }
  }

  // 🔧 CORREGIDO: Método para formatear servicios con múltiples categorías para el frontend
  formatServicioDisplay(servicio) {
    if (!servicio) return null;
    
    // 🆕 PARSEAR múltiples categorías del JSON
    let categoriasArray = [];
    try {
      if (servicio.categorias_ids) {
        categoriasArray = JSON.parse(servicio.categorias_ids);
      } else if (servicio.categorias_id) {
        // Fallback a categoría única
        categoriasArray = [servicio.categorias_id];
      }
    } catch (error) {
      console.error('Error parseando categorias_ids:', error);
      if (servicio.categorias_id) {
        categoriasArray = [servicio.categorias_id];
      }
    }
    
    // Obtener información de la categoría principal (para compatibilidad)
    const categoriaPrincipal = servicio.categoria ? {
      categorias_id: servicio.categoria.categorias_id,
      nombre: servicio.categoria.nombre,
      descripcion: servicio.categoria.descripcion,
      unidad_medida: servicio.categoria.unidad_medida ? {
        id: servicio.categoria.unidad_medida.unidades_medida_id,
        nombre: servicio.categoria.unidad_medida.nombre,
        abreviacion: servicio.categoria.unidad_medida.abreviacion,
        tipo: servicio.categoria.unidad_medida.tipo,
        descripcion: servicio.categoria.unidad_medida.descripcion
      } : null
    } : null;
    
    return {
      servicios_id: servicio.servicios_id,
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      precio_minimo: parseFloat(servicio.precio_minimo) || 0,
      precio_recomendado: parseFloat(servicio.precio_recomendado) || 0,
      categorias_id: servicio.categorias_id, // 🔧 Mantener compatibilidad
      categorias_ids: categoriasArray, // 🆕 Array de IDs de categorías
      categoria: categoriaPrincipal, // 🔧 Categoría principal para compatibilidad
      estado: servicio.estado,
      created_at: servicio.created_at,
      updated_at: servicio.updated_at
    };
  }

  // 🆕 NUEVO: Método helper para validar estructura de categorías
  validateCategoriasStructure(categorias) {
    if (!categorias) return { valid: false, message: 'Las categorías son requeridas' };
    
    if (!Array.isArray(categorias)) {
      return { valid: false, message: 'Las categorías deben ser un array' };
    }
    
    if (categorias.length === 0) {
      return { valid: false, message: 'Debe seleccionar al menos una categoría' };
    }
    
    // Verificar que todos los elementos sean números válidos
    const invalidCategories = categorias.filter(cat => !Number.isInteger(parseInt(cat)));
    if (invalidCategories.length > 0) {
      return { valid: false, message: 'Todas las categorías deben ser IDs válidos' };
    }
    
    return { valid: true };
  }

  // 🆕 NUEVO: Método para migrar servicios existentes a múltiples categorías
  async migrateToMultipleCategories() {
    try {
      console.log('🔄 Iniciando migración a múltiples categorías...');
      
      const serviciosSinCategorias = await Servicio.findAll({
        where: {
          categorias_ids: { [Op.is]: null },
          categorias_id: { [Op.not]: null }
        }
      });
      
      console.log(`📋 Encontrados ${serviciosSinCategorias.length} servicios para migrar`);
      
      for (const servicio of serviciosSinCategorias) {
        await servicio.update({
         categorias_ids: JSON.stringify([servicio.categorias_id])
       });
     }
     
     console.log('✅ Migración completada exitosamente');
     
     return {
       success: true,
       message: `${serviciosSinCategorias.length} servicios migrados exitosamente`
     };
     
   } catch (error) {
     console.error('❌ Error en migración:', error);
     return {
       success: false,
       message: 'Error durante la migración'
     };
   }
 }

 // 🔧 CORREGIDO: Método getServiciosWithExpandedCategories

async getServiciosWithExpandedCategories(filters = {}) {
  try {
    const result = await this.getServicios(filters);
    
    if (!result.success) return result;
    
    // Expandir categorías para cada servicio
    const serviciosExpandidos = await Promise.all(
      result.servicios.map(async (servicio) => {
        console.log(`🔍 Expandiendo categorías para servicio ${servicio.servicios_id}:`, {
          categorias_id: servicio.categorias_id,
          categorias_ids: servicio.categorias_ids
        });
        
        const categoriesResult = await this.getCategoriesForServicio(servicio.servicios_id);
        
        const servicioFormateado = this.formatServicioDisplay(servicio);
        
        return {
          ...servicioFormateado,
          categorias_completas: categoriesResult.success ? categoriesResult.categorias : []
        };
      })
    );
    
    return {
      ...result,
      servicios: serviciosExpandidos
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo servicios con categorías expandidas:', error);
    throw error;
  }
}

 // 🆕 NUEVO: Método para verificar conflictos de nombres
 async checkNameConflicts(nombre, categoriasIds, excludeId = null) {
   try {
     if (!nombre || !categoriasIds || !Array.isArray(categoriasIds)) {
       return { hasConflicts: false, conflicts: [] };
     }
     
     const whereCondition = {
       nombre: { [Op.like]: nombre.trim() },
       estado: 'activo'
     };
     
     if (excludeId) {
       whereCondition.servicios_id = { [Op.ne]: excludeId };
     }
     
     // Buscar conflictos en cualquiera de las categorías
     whereCondition[Op.or] = [
       { categorias_id: { [Op.in]: categoriasIds } },
       ...categoriasIds.map(catId => 
         sequelize.where(
           sequelize.fn('JSON_CONTAINS', 
             sequelize.col('categorias_ids'), 
             `"${catId}"`
           ), 
           true
         )
       )
     ];
     
     const conflictos = await Servicio.findAll({
       where: whereCondition,
       include: [{
         model: Categoria,
         as: 'categoria',
         attributes: ['categorias_id', 'nombre']
       }],
       attributes: ['servicios_id', 'nombre', 'categorias_id', 'categorias_ids']
     });
     
     return {
       hasConflicts: conflictos.length > 0,
       conflicts: conflictos.map(servicio => ({
         id: servicio.servicios_id,
         nombre: servicio.nombre,
         categoria_principal: servicio.categoria?.nombre || 'Sin categoría'
       }))
     };
     
   } catch (error) {
     console.error('❌ Error verificando conflictos de nombres:', error);
     return { hasConflicts: false, conflicts: [] };
   }
 }

 // 🆕 NUEVO: Método para obtener estadísticas avanzadas por categoría
 async getAdvancedCategoryStats() {
   try {
     const estadisticas = await sequelize.query(`
       SELECT 
         c.categorias_id,
         c.nombre as categoria_nombre,
         COUNT(DISTINCT CASE 
           WHEN s.categorias_id = c.categorias_id OR JSON_CONTAINS(s.categorias_ids, CONCAT('"', c.categorias_id, '"')) 
           THEN s.servicios_id 
         END) as total_servicios,
         COUNT(DISTINCT CASE 
           WHEN (s.categorias_id = c.categorias_id OR JSON_CONTAINS(s.categorias_ids, CONCAT('"', c.categorias_id, '"'))) 
           AND s.estado = 'activo'
           THEN s.servicios_id 
         END) as servicios_activos,
         AVG(CASE 
           WHEN (s.categorias_id = c.categorias_id OR JSON_CONTAINS(s.categorias_ids, CONCAT('"', c.categorias_id, '"'))) 
           AND s.estado = 'activo'
           THEN s.precio_recomendado 
         END) as precio_promedio,
         MIN(CASE 
           WHEN (s.categorias_id = c.categorias_id OR JSON_CONTAINS(s.categorias_ids, CONCAT('"', c.categorias_id, '"'))) 
           AND s.estado = 'activo'
           THEN s.precio_recomendado 
         END) as precio_minimo,
         MAX(CASE 
           WHEN (s.categorias_id = c.categorias_id OR JSON_CONTAINS(s.categorias_ids, CONCAT('"', c.categorias_id, '"'))) 
           AND s.estado = 'activo'
           THEN s.precio_recomendado 
         END) as precio_maximo
       FROM categorias c
       LEFT JOIN servicios s ON (
         s.categorias_id = c.categorias_id OR 
         JSON_CONTAINS(s.categorias_ids, CONCAT('"', c.categorias_id, '"'))
       )
       GROUP BY c.categorias_id, c.nombre
       ORDER BY total_servicios DESC
     `, {
       type: sequelize.QueryTypes.SELECT
     });
     
     return {
       success: true,
       estadisticas: estadisticas.map(stat => ({
         categoria_id: stat.categorias_id,
         categoria_nombre: stat.categoria_nombre,
         total_servicios: parseInt(stat.total_servicios) || 0,
         servicios_activos: parseInt(stat.servicios_activos) || 0,
         precio_promedio: parseFloat(stat.precio_promedio || 0).toFixed(2),
         precio_minimo: parseFloat(stat.precio_minimo || 0).toFixed(2),
         precio_maximo: parseFloat(stat.precio_maximo || 0).toFixed(2)
       }))
     };
     
   } catch (error) {
     console.error('❌ Error obteniendo estadísticas avanzadas:', error);
     return {
       success: false,
       estadisticas: []
     };
   }
 }

 // 🆕 NUEVO: Método para obtener servicios relacionados (que comparten categorías)
 async getRelatedServicios(servicioId, limit = 5) {
   try {
     const servicio = await Servicio.findByPk(servicioId);
     
     if (!servicio) {
       return { success: false, servicios: [] };
     }
     
     let categoriasIds = [];
     try {
       if (servicio.categorias_ids) {
         categoriasIds = JSON.parse(servicio.categorias_ids);
       } else if (servicio.categorias_id) {
         categoriasIds = [servicio.categorias_id];
       }
     } catch (error) {
       if (servicio.categorias_id) {
         categoriasIds = [servicio.categorias_id];
       }
     }
     
     if (categoriasIds.length === 0) {
       return { success: true, servicios: [] };
     }
     
     const serviciosRelacionados = await Servicio.findAll({
       where: {
         servicios_id: { [Op.ne]: servicioId },
         estado: 'activo',
         [Op.or]: [
           { categorias_id: { [Op.in]: categoriasIds } },
           ...categoriasIds.map(catId => 
             sequelize.where(
               sequelize.fn('JSON_CONTAINS', 
                 sequelize.col('categorias_ids'), 
                 `"${catId}"`
               ), 
               true
             )
           )
         ]
       },
       include: [{
         model: Categoria,
         as: 'categoria',
         attributes: ['categorias_id', 'nombre'],
         include: [{
           model: UnidadMedida,
           as: 'unidad_medida',
           attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo']
         }]
       }],
       limit: parseInt(limit),
       order: [['created_at', 'DESC']]
     });
     
     return {
       success: true,
       servicios: serviciosRelacionados.map(s => this.formatServicioDisplay(s))
     };
     
   } catch (error) {
     console.error('❌ Error obteniendo servicios relacionados:', error);
     return {
       success: false,
       servicios: []
     };
   }
 }

 // 🆕 NUEVO: Método para validar integridad de datos
 async validateDataIntegrity() {
   try {
     console.log('🔍 Iniciando validación de integridad de datos...');
     
     const issues = [];
     
     // 1. Servicios con categorias_ids inválidos
     const serviciosConJsonInvalido = await Servicio.findAll({
       where: {
         categorias_ids: { [Op.not]: null }
       }
     });
     
     for (const servicio of serviciosConJsonInvalido) {
       try {
         const categorias = JSON.parse(servicio.categorias_ids);
         if (!Array.isArray(categorias)) {
           issues.push({
             type: 'invalid_json_structure',
             servicio_id: servicio.servicios_id,
             nombre: servicio.nombre,
             issue: 'categorias_ids no es un array válido'
           });
         }
       } catch (error) {
         issues.push({
           type: 'invalid_json',
           servicio_id: servicio.servicios_id,
           nombre: servicio.nombre,
           issue: 'categorias_ids contiene JSON inválido'
         });
       }
     }
     
     // 2. Servicios con categorías inexistentes
     const serviciosConCategorias = await Servicio.findAll({
       where: {
         [Op.or]: [
           { categorias_id: { [Op.not]: null } },
           { categorias_ids: { [Op.not]: null } }
         ]
       }
     });
     
     const categoriasExistentes = await Categoria.findAll({
       attributes: ['categorias_id']
     });
     const categoriasIds = categoriasExistentes.map(c => c.categorias_id);
     
     for (const servicio of serviciosConCategorias) {
       // Verificar categoría principal
       if (servicio.categorias_id && !categoriasIds.includes(servicio.categorias_id)) {
         issues.push({
           type: 'missing_main_category',
           servicio_id: servicio.servicios_id,
           nombre: servicio.nombre,
           issue: `Categoría principal ${servicio.categorias_id} no existe`
         });
       }
       
       // Verificar categorías adicionales
       if (servicio.categorias_ids) {
         try {
           const categorias = JSON.parse(servicio.categorias_ids);
           for (const catId of categorias) {
             if (!categoriasIds.includes(parseInt(catId))) {
               issues.push({
                 type: 'missing_additional_category',
                 servicio_id: servicio.servicios_id,
                 nombre: servicio.nombre,
                 issue: `Categoría ${catId} en categorias_ids no existe`
               });
             }
           }
         } catch (error) {
           // Ya capturado en el paso anterior
         }
       }
     }
     
     console.log(`✅ Validación completada. Encontrados ${issues.length} problemas`);
     
     return {
       success: true,
       issues: issues,
       summary: {
         total_issues: issues.length,
         invalid_json: issues.filter(i => i.type === 'invalid_json').length,
         invalid_structure: issues.filter(i => i.type === 'invalid_json_structure').length,
         missing_categories: issues.filter(i => i.type.includes('missing')).length
       }
     };
     
   } catch (error) {
     console.error('❌ Error en validación de integridad:', error);
     return {
       success: false,
       issues: [],
       error: error.message
     };
   }
 }
}

module.exports = new ServicioService();