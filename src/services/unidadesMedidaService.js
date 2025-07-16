// services/unidadesMedidaService.js

const { UnidadMedida, Categoria, CotizacionDetalle } = require('../models');
const { Op } = require('sequelize');

class UnidadesMedidaService {
  
  // ==================== OBTENER UNIDADES CON PAGINACIÓN ====================
  async getUnidades(filtros = {}) {
    try {
      const {
        page = 1,
        limit = 25,
        search,
        tipo,
        activo
      } = filtros;

      // Construir condiciones WHERE
      const whereConditions = {};

      // Filtro de búsqueda
      if (search) {
        whereConditions[Op.or] = [
          { nombre: { [Op.like]: `%${search}%` } },
          { descripcion: { [Op.like]: `%${search}%` } },
          { abreviacion: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filtro por tipo
      if (tipo) {
        whereConditions.tipo = tipo;
      }

      // Filtro por estado activo
      if (activo !== undefined && activo !== '') {
        whereConditions.activo = activo === '1' || activo === 1 || activo === true;
      }

      // Calcular offset para paginación
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Ejecutar consulta con paginación
      const { count, rows } = await UnidadMedida.findAndCountAll({
        where: whereConditions,
        limit: parseInt(limit),
        offset: offset,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: Categoria,
            as: 'categorias',
            attributes: ['categorias_id', 'nombre', 'estado'],
            required: false
          }
        ]
      });

      // Calcular información de paginación
      const totalPages = Math.ceil(count / parseInt(limit));
      const currentPage = parseInt(page);

      return {
        success: true,
        data: {
          unidades: rows,
          pagination: {
            currentPage,
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit),
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
          }
        }
      };

    } catch (error) {
      console.error('❌ Error en getUnidades:', error);
      throw new Error(`Error al obtener unidades de medida: ${error.message}`);
    }
  }

  // ==================== OBTENER UNIDAD POR ID ====================
  async getUnidadById(id) {
    try {
      const unidad = await UnidadMedida.findByPk(id, {
        include: [
          {
            model: Categoria,
            as: 'categorias',
            attributes: ['categorias_id', 'nombre', 'estado'],
            required: false
          }
        ]
      });

      if (!unidad) {
        return {
          success: false,
          message: 'Unidad de medida no encontrada'
        };
      }

      return {
        success: true,
        data: unidad
      };

    } catch (error) {
      console.error('❌ Error en getUnidadById:', error);
      throw new Error(`Error al obtener unidad de medida: ${error.message}`);
    }
  }

  // ==================== CREAR UNIDAD ====================
  async createUnidad(datosUnidad) {
    try {
      const { nombre, descripcion, abreviacion, tipo, activo = true } = datosUnidad;

      // Validaciones
      const validacionResult = await this.validarDatosUnidad(datosUnidad);
      if (!validacionResult.success) {
        return validacionResult;
      }

      // Crear la unidad
      const nuevaUnidad = await UnidadMedida.create({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim(),
        abreviacion: abreviacion.trim().toUpperCase(),
        tipo,
        activo: activo === true || activo === 1 || activo === '1'
      });

      return {
        success: true,
        message: 'Unidad de medida creada exitosamente',
        data: nuevaUnidad
      };

    } catch (error) {
      console.error('❌ Error en createUnidad:', error);
      
      // Manejar errores de duplicación
      if (error.name === 'SequelizeUniqueConstraintError') {
        const campo = error.errors[0].path;
        const valor = error.errors[0].value;
        
        return {
          success: false,
          message: `${campo === 'nombre' ? 'El nombre' : 'La abreviación'} "${valor}" ya está en uso`,
          errors: [{
            field: campo,
            message: `${campo === 'nombre' ? 'El nombre' : 'La abreviación'} ya existe`
          }]
        };
      }

      throw new Error(`Error al crear unidad de medida: ${error.message}`);
    }
  }

  // ==================== ACTUALIZAR UNIDAD ====================
  async updateUnidad(id, datosUnidad) {
    try {
      const unidad = await UnidadMedida.findByPk(id);
      
      if (!unidad) {
        return {
          success: false,
          message: 'Unidad de medida no encontrada'
        };
      }

      // Validaciones (excluyendo el ID actual)
      const validacionResult = await this.validarDatosUnidad(datosUnidad, id);
      if (!validacionResult.success) {
        return validacionResult;
      }

      const { nombre, descripcion, abreviacion, tipo, activo } = datosUnidad;

      // Actualizar la unidad
      await unidad.update({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim(),
        abreviacion: abreviacion.trim().toUpperCase(),
        tipo,
        activo: activo === true || activo === 1 || activo === '1'
      });

      return {
        success: true,
        message: 'Unidad de medida actualizada exitosamente',
        data: unidad
      };

    } catch (error) {
      console.error('❌ Error en updateUnidad:', error);
      
      // Manejar errores de duplicación
      if (error.name === 'SequelizeUniqueConstraintError') {
        const campo = error.errors[0].path;
        const valor = error.errors[0].value;
        
        return {
          success: false,
          message: `${campo === 'nombre' ? 'El nombre' : 'La abreviación'} "${valor}" ya está en uso`,
          errors: [{
            field: campo,
            message: `${campo === 'nombre' ? 'El nombre' : 'La abreviación'} ya existe`
          }]
        };
      }

      throw new Error(`Error al actualizar unidad de medida: ${error.message}`);
    }
  }

  // ==================== DESACTIVAR UNIDAD ====================
  async deleteUnidad(id) {
    try {
      const unidad = await UnidadMedida.findByPk(id);
      
      if (!unidad) {
        return {
          success: false,
          message: 'Unidad de medida no encontrada'
        };
      }

      // Verificar si tiene categorías asociadas activas
      const categoriasActivas = await Categoria.count({
        where: {
          unidades_medida_id: id,
          estado: 'activo'
        }
      });

      if (categoriasActivas > 0) {
        return {
          success: false,
          message: `No se puede desactivar la unidad porque tiene ${categoriasActivas} categoría(s) activa(s) asociada(s)`
        };
      }

      // Desactivar la unidad (soft delete)
      await unidad.update({ activo: false });

      return {
        success: true,
        message: 'Unidad de medida desactivada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error en deleteUnidad:', error);
      throw new Error(`Error al desactivar unidad de medida: ${error.message}`);
    }
  }

  // ==================== REACTIVAR UNIDAD ====================
  async restoreUnidad(id) {
    try {
      const unidad = await UnidadMedida.findByPk(id);
      
      if (!unidad) {
        return {
          success: false,
          message: 'Unidad de medida no encontrada'
        };
      }

      // Reactivar la unidad
      await unidad.update({ activo: true });

      return {
        success: true,
        message: 'Unidad de medida reactivada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error en restoreUnidad:', error);
      throw new Error(`Error al reactivar unidad de medida: ${error.message}`);
    }
  }

  // ==================== OBTENER ESTADÍSTICAS ====================
  async getEstadisticas() {
    try {
      const [total, activas, inactivas, tiposQuery] = await Promise.all([
        UnidadMedida.count(),
        UnidadMedida.count({ where: { activo: true } }),
        UnidadMedida.count({ where: { activo: false } }),
        UnidadMedida.findAll({
          attributes: ['tipo'],
          group: ['tipo'],
          raw: true
        })
      ]);

      const tipos_disponibles = tiposQuery.length;

      return {
        success: true,
        data: {
          total,
          activas,
          inactivas,
          tipos_disponibles
        }
      };

    } catch (error) {
      console.error('❌ Error en getEstadisticas:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  // ==================== BUSCAR UNIDADES ====================
  async buscarUnidades(termino) {
    try {
      const unidades = await UnidadMedida.findAll({
        where: {
          [Op.and]: [
            { activo: true },
            {
              [Op.or]: [
                { nombre: { [Op.like]: `%${termino}%` } },
                { abreviacion: { [Op.like]: `%${termino}%` } }
              ]
            }
          ]
        },
        limit: 10,
        order: [['nombre', 'ASC']]
      });

      return {
        success: true,
        data: unidades
      };

    } catch (error) {
      console.error('❌ Error en buscarUnidades:', error);
      throw new Error(`Error al buscar unidades: ${error.message}`);
    }
  }

  // ==================== VALIDACIONES ====================
  async validarDatosUnidad(datos, excludeId = null) {
    const errores = [];
    const { nombre, descripcion, abreviacion, tipo } = datos;

    // Validar nombre
    if (!nombre || !nombre.trim()) {
      errores.push({
        field: 'nombre',
        message: 'El nombre es requerido'
      });
    } else if (nombre.trim().length < 2) {
      errores.push({
        field: 'nombre',
        message: 'El nombre debe tener al menos 2 caracteres'
      });
    } else if (nombre.trim().length > 100) {
      errores.push({
        field: 'nombre',
        message: 'El nombre no puede exceder 100 caracteres'
      });
    }

    // Validar abreviación
    if (!abreviacion || !abreviacion.trim()) {
      errores.push({
        field: 'abreviacion',
        message: 'La abreviación es requerida'
      });
    } else if (abreviacion.trim().length > 20) {
      errores.push({
        field: 'abreviacion',
        message: 'La abreviación no puede exceder 20 caracteres'
      });
    }

    // Validar tipo
    const tiposValidos = ['cantidad', 'capacidad', 'tiempo', 'usuarios', 'sesiones'];
    if (!tipo || !tiposValidos.includes(tipo)) {
      errores.push({
        field: 'tipo',
        message: 'El tipo de unidad es requerido y debe ser válido'
      });
    }

    // Validar descripción
    if (!descripcion || !descripcion.trim()) {
      errores.push({
        field: 'descripcion',
        message: 'La descripción es requerida'
      });
    } else if (descripcion.trim().length > 500) {
      errores.push({
        field: 'descripcion',
        message: 'La descripción no puede exceder 500 caracteres'
      });
    }

    // Verificar duplicados
    if (nombre && nombre.trim()) {
      const whereCondition = { nombre: nombre.trim() };
      if (excludeId) {
        whereCondition.unidades_medida_id = { [Op.ne]: excludeId };
      }
      
      const nombreExistente = await UnidadMedida.findOne({ where: whereCondition });
      if (nombreExistente) {
        errores.push({
          field: 'nombre',
          message: 'Ya existe una unidad de medida con este nombre'
        });
      }
    }

    if (abreviacion && abreviacion.trim()) {
      const whereCondition = { abreviacion: abreviacion.trim().toUpperCase() };
      if (excludeId) {
        whereCondition.unidades_medida_id = { [Op.ne]: excludeId };
      }
      
      const abreviacionExistente = await UnidadMedida.findOne({ where: whereCondition });
      if (abreviacionExistente) {
        errores.push({
          field: 'abreviacion',
          message: 'Ya existe una unidad de medida con esta abreviación'
        });
      }
    }

    if (errores.length > 0) {
      return {
        success: false,
        message: 'Errores de validación',
        errors: errores
      };
    }

    return { success: true };
  }
}

module.exports = new UnidadesMedidaService();