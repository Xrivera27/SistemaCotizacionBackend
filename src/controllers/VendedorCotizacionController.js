const { Cotizacion, CotizacionDetalle, Cliente, Usuario, Servicio, Categoria } = require('../models');
const { Op } = require('sequelize');

class VendedorCotizacionController {
  
  // Obtener mis cotizaciones con filtros y paginación
  async getMisCotizaciones(req, res) {
    try {
      // 🔍 DEBUG para ver qué tenemos
      console.log('🔍 Debug - req.user completo:', JSON.stringify(req.user, null, 2));
      
      // ✅ CORRECCIÓN: Usar req.user.id (que contiene usuarios_id)
      const usuarioId = req.user?.id; 
      console.log('🔍 Debug - Usuario ID del middleware:', usuarioId);
      
      if (!usuarioId) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo obtener el ID del usuario del token'
        });
      }

      const {
        page = 1,
        limit = 25,
        search = '',
        estado = '',
        periodo = ''
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereConditions = {
        usuarios_id: usuarioId // Solo cotizaciones del vendedor
      };
      let clienteWhere = {};

      console.log('🔍 Debug - Where conditions:', whereConditions);

      // Filtro de búsqueda
      if (search) {
        const searchConditions = {
          [Op.or]: [
            { '$cliente.nombre_empresa$': { [Op.like]: `%${search}%` } },
            { '$cliente.nombre_encargado$': { [Op.like]: `%${search}%` } }
          ]
        };
        whereConditions = { ...whereConditions, ...searchConditions };
      }

      // Filtro por estado
      if (estado) {
        whereConditions.estado = estado;
      }

      // Filtro por período
      if (periodo) {
        const now = new Date();
        let dateCondition = {};

        switch (periodo) {
          case 'hoy':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateCondition = {
              fecha_creacion: {
                [Op.gte]: today,
                [Op.lt]: tomorrow
              }
            };
            break;
          case 'semana':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateCondition = {
              fecha_creacion: { [Op.gte]: weekAgo }
            };
            break;
          case 'mes':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            dateCondition = {
              fecha_creacion: {
                [Op.gte]: startOfMonth,
                [Op.lte]: endOfMonth
              }
            };
            break;
          case 'trimestre':
            const quarter = Math.floor(now.getMonth() / 3);
            const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
            const endOfQuarter = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
            dateCondition = {
              fecha_creacion: {
                [Op.gte]: startOfQuarter,
                [Op.lte]: endOfQuarter
              }
            };
            break;
        }

        if (Object.keys(dateCondition).length > 0) {
          whereConditions = { ...whereConditions, ...dateCondition };
        }
      }

      // Obtener cotizaciones con paginación
      const { count, rows: cotizaciones } = await Cotizacion.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Cliente,
            as: 'cliente',
            where: clienteWhere,
            required: true
          },
          {
            model: Usuario,
            as: 'vendedor',
            required: true,
            attributes: ['usuarios_id', 'nombre_completo', 'tipo_usuario']
          },
          {
            model: CotizacionDetalle,
            as: 'detalles',
            include: [
              {
                model: Servicio,
                as: 'servicio',
                include: [
                  {
                    model: Categoria,
                    as: 'categoria'
                  }
                ]
              }
            ]
          }
        ],
        order: [['fecha_creacion', 'DESC']],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      console.log('🔍 Debug - Cotizaciones encontradas:', count);

      // Formatear datos para el frontend
      const cotizacionesFormateadas = cotizaciones.map(cotizacion => {
        const serviciosDetalles = cotizacion.detalles.map(detalle => ({
          id: detalle.servicios_id,
          nombre: detalle.servicio.nombre,
          descripcion: detalle.servicio.descripcion,
          categoria: detalle.servicio.categoria?.nombre || 'Sin categoría',
          cantidadEquipos: detalle.cantidad_equipos || 0,
          cantidadServicios: detalle.cantidad_servicios || 0,
          cantidadGB: detalle.cantidad_gb || 0,
          cantidadAnos: detalle.cantidad_anos || 1,
          precioUsado: parseFloat(detalle.precio_usado),
          subtotal: parseFloat(detalle.subtotal)
        }));
        
        return {
          id: cotizacion.cotizaciones_id,
          numero: `CT${String(cotizacion.cotizaciones_id).padStart(6, '0')}`,
          cliente: {
            nombre: cotizacion.cliente.nombre_empresa,
            email: cotizacion.cliente.correo_empresa || cotizacion.cliente.correo_personal || 'No especificado',
            telefono: cotizacion.cliente.telefono_empresa || cotizacion.cliente.telefono_personal || 'No especificado'
          },
          serviciosDetalles: serviciosDetalles,
          fechaCreacion: cotizacion.fecha_creacion,
          estado: cotizacion.estado,
          total: parseFloat(cotizacion.total),
          pdfGenerado: cotizacion.pdf_generado,
          comentario: cotizacion.comentario
        };
      });

      // Información de paginación
      const totalPages = Math.ceil(count / parseInt(limit));
      const pagination = {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      };

      console.log('✅ Cotizaciones formateadas exitosamente');

      res.json({
        success: true,
        cotizaciones: cotizacionesFormateadas,
        pagination: pagination
      });

    } catch (error) {
      console.error('Error al obtener cotizaciones del vendedor:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener estadísticas del vendedor
  async getMisEstadisticas(req, res) {
    try {
      console.log('🔍 Debug - req.user completo (estadísticas):', JSON.stringify(req.user, null, 2));
      
      // ✅ CORRECCIÓN: Usar req.user.id
      const usuarioId = req.user?.id;
      console.log('🔍 Debug - Usuario ID del middleware para estadísticas:', usuarioId);

      if (!usuarioId) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo obtener el ID del usuario del token'
        });
      }

      // Contar por estado
      const estadisticasEstado = await Cotizacion.findAll({
        where: { usuarios_id: usuarioId },
        attributes: [
          'estado',
          [Cotizacion.sequelize.fn('COUNT', Cotizacion.sequelize.col('estado')), 'cantidad']
        ],
        group: ['estado']
      });

      console.log('🔍 Debug - Estadísticas encontradas:', estadisticasEstado);

      // Formatear estadísticas
      const stats = {
        total: 0,
        esperandoAprobacion: 0,
        pendientes: 0,
        efectivas: 0,
        rechazadas: 0
      };

      estadisticasEstado.forEach(stat => {
        const cantidad = parseInt(stat.dataValues.cantidad);
        stats.total += cantidad;

        switch (stat.estado) {
          case 'pendiente_aprobacion':
            stats.esperandoAprobacion = cantidad;
            break;
          case 'pendiente':
            stats.pendientes = cantidad;
            break;
          case 'efectiva':
            stats.efectivas = cantidad;
            break;
          case 'rechazada':
            stats.rechazadas = cantidad;
            break;
        }
      });

      console.log('🔍 Debug - Stats finales:', stats);

      res.json({
        success: true,
        estadisticas: stats
      });

    } catch (error) {
      console.error('Error al obtener estadísticas del vendedor:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener una cotización específica del vendedor
  async getMiCotizacionById(req, res) {
    try {
      const { id } = req.params;
      // ✅ CORRECCIÓN: Usar req.user.id
      const usuarioId = req.user?.id;

      console.log('🔍 Debug - Buscando cotización:', id, 'para usuario:', usuarioId);

      if (!usuarioId) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo obtener el ID del usuario del token'
        });
      }

      const cotizacion = await Cotizacion.findOne({
        where: {
          cotizaciones_id: id,
          usuarios_id: usuarioId // Solo si es del vendedor
        },
        include: [
          {
            model: Cliente,
            as: 'cliente'
          },
          {
            model: Usuario,
            as: 'vendedor',
            attributes: ['usuarios_id', 'nombre_completo', 'tipo_usuario']
          },
          {
            model: CotizacionDetalle,
            as: 'detalles',
            include: [
              {
                model: Servicio,
                as: 'servicio',
                include: [
                  {
                    model: Categoria,
                    as: 'categoria'
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!cotizacion) {
        return res.status(404).json({
          success: false,
          message: 'Cotización no encontrada o no tienes permisos para verla'
        });
      }

      // Buscar información de auditoría (quién aprobó/rechazó)
      let usuarioAprobador = null;
      let usuarioRechazador = null;

      if (cotizacion.aprobado_por) {
        usuarioAprobador = await Usuario.findByPk(cotizacion.aprobado_por, {
          attributes: ['usuarios_id', 'nombre_completo', 'tipo_usuario']
        });
      }

      if (cotizacion.rechazado_por) {
        usuarioRechazador = await Usuario.findByPk(cotizacion.rechazado_por, {
          attributes: ['usuarios_id', 'nombre_completo', 'tipo_usuario']
        });
      }

      // Formatear datos para el frontend
      const cotizacionFormateada = {
        id: cotizacion.cotizaciones_id,
        numero: `COT-${new Date().getFullYear()}-${String(cotizacion.cotizaciones_id).padStart(3, '0')}`,
        cliente: {
          nombre: cotizacion.cliente.nombre_empresa,
          email: cotizacion.cliente.correo_empresa || cotizacion.cliente.correo_personal || 'No especificado',
          encargado: cotizacion.cliente.nombre_encargado,
          telefono: cotizacion.cliente.telefono_empresa || cotizacion.cliente.telefono_personal,
          documentoFiscal: cotizacion.cliente.documento_fiscal
        },
        servicios: cotizacion.detalles.map(detalle => ({
          id: detalle.servicios_id,
          nombre: detalle.servicio.nombre,
          descripcion: detalle.servicio.descripcion,
          categoria: detalle.servicio.categoria?.nombre || 'Sin categoría',
          cantidadEquipos: detalle.cantidad_equipos,
          cantidadServicios: detalle.cantidad_servicios,
          cantidadGB: detalle.cantidad_gb,
          cantidadAnos: detalle.cantidad_anos || 1,
          precioUsado: parseFloat(detalle.precio_usado),
          subtotal: parseFloat(detalle.subtotal)
        })),
        fechaCreacion: cotizacion.fecha_creacion,
        estado: cotizacion.estado,
        total: parseFloat(cotizacion.total),
        pdfGenerado: cotizacion.pdf_generado,
        comentario: cotizacion.comentario,
        configuracionPDF: {
          incluirNombreEncargado: cotizacion.incluir_nombre_encargado,
          incluirNombreEmpresa: cotizacion.incluir_nombre_empresa,
          incluirDocumentoFiscal: cotizacion.incluir_documento_fiscal,
          incluirTelefonoEmpresa: cotizacion.incluir_telefono_empresa,
          incluirCorreoEmpresa: cotizacion.incluir_correo_empresa,
          tipoPrecioPDF: cotizacion.tipo_precio_pdf
        },
        auditoria: {
          aprobadoPor: usuarioAprobador ? {
            id: usuarioAprobador.usuarios_id,
            nombre: usuarioAprobador.nombre_completo,
            rol: this.formatearRol(usuarioAprobador.tipo_usuario)
          } : null,
          aprobadoPorNombre: cotizacion.aprobado_por_nombre,
          fechaAprobacion: cotizacion.fecha_aprobacion,
          rechazadoPor: usuarioRechazador ? {
            id: usuarioRechazador.usuarios_id,
            nombre: usuarioRechazador.nombre_completo,
            rol: this.formatearRol(usuarioRechazador.tipo_usuario)
          } : null,
          rechazadoPorNombre: cotizacion.rechazado_por_nombre,
          fechaRechazo: cotizacion.fecha_rechazo
        }
      };

      console.log('✅ Cotización encontrada y formateada');

      res.json({
        success: true,
        cotizacion: cotizacionFormateada
      });

    } catch (error) {
      console.error('Error al obtener cotización del vendedor:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Generar PDF de cotización del vendedor
  async generarMiPDF(req, res) {
    try {
      const { id } = req.params;
      const { tipo = 'copia' } = req.query;
      // ✅ CORRECCIÓN: Usar req.user.id
      const usuarioId = req.user?.id;

      console.log('🔍 Debug - Generando PDF para cotización:', id, 'usuario:', usuarioId, 'tipo:', tipo);

      if (!usuarioId) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo obtener el ID del usuario del token'
        });
      }

      const cotizacion = await Cotizacion.findOne({
        where: {
          cotizaciones_id: id,
          usuarios_id: usuarioId // Solo si es del vendedor
        },
        include: [
          {
            model: Cliente,
            as: 'cliente'
          },
          {
            model: Usuario,
            as: 'vendedor'
          },
          {
            model: CotizacionDetalle,
            as: 'detalles',
            include: [
              {
                model: Servicio,
                as: 'servicio',
                include: [
                  {
                    model: Categoria,
                    as: 'categoria'
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!cotizacion) {
        return res.status(404).json({
          success: false,
          message: 'Cotización no encontrada o no tienes permisos para verla'
        });
      }

      // Validar que el PDF se puede generar
      if (cotizacion.estado === 'pendiente_aprobacion') {
        return res.status(400).json({
          success: false,
          message: 'No se puede generar PDF mientras la cotización esté esperando aprobación'
        });
      }

      // Importar el método de generación de PDF del controller principal
      const CotizacionController = require('./cotizacionController');
      const controllerInstance = new CotizacionController();
      const pdfBuffer = await controllerInstance.generarPDFCotizacion(cotizacion, tipo);

      const numeroDocumento = `COT-${new Date().getFullYear()}-${String(cotizacion.cotizaciones_id).padStart(3, '0')}`;
      const tipoTexto = tipo === 'copia' ? 'Copia' : 'Original';
      const nombreArchivo = `${numeroDocumento}_${tipoTexto}.pdf`;

      // Marcar PDF como generado
      await cotizacion.update({ pdf_generado: true });

      console.log('✅ PDF generado exitosamente:', nombreArchivo);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Error al generar PDF del vendedor:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar PDF',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

// En VendedorCotizacionController.js - método duplicarCotizacion
async duplicarCotizacion(req, res) {
  try {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    console.log('🔍 Debug - Obteniendo datos para duplicar cotización:', id, 'para usuario:', usuarioId);

    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo obtener el ID del usuario del token'
      });
    }

    // Buscar cotización original CON TODOS LOS DATOS
    const cotizacionOriginal = await Cotizacion.findOne({
      where: {
        cotizaciones_id: id,
        usuarios_id: usuarioId
      },
      include: [
        {
          model: Cliente,
          as: 'cliente'
        },
        {
          model: CotizacionDetalle,
          as: 'detalles',
          include: [
            {
              model: Servicio,
              as: 'servicio',
              include: [
                {
                  model: Categoria,
                  as: 'categoria'
                }
              ]
            }
          ]
        }
      ]
    });

    if (!cotizacionOriginal) {
      return res.status(404).json({
        success: false,
        message: 'Cotización no encontrada o no tienes permisos para duplicarla'
      });
    }

    // Formatear datos para la página de crear cotización
    const datosParaDuplicar = {
      // Información del cliente
      cliente: {
        id: cotizacionOriginal.clientes_id,
        nombre: cotizacionOriginal.cliente.nombre_empresa,
        encargado: cotizacionOriginal.cliente.nombre_encargado,
        email: cotizacionOriginal.cliente.correo_empresa || cotizacionOriginal.cliente.correo_personal,
        telefono: cotizacionOriginal.cliente.telefono_empresa || cotizacionOriginal.cliente.telefono_personal,
        documentoFiscal: cotizacionOriginal.cliente.documento_fiscal
      },
      
      // ✅ SERVICIOS CON CÁLCULO CORREGIDO USANDO SUBTOTAL
      servicios: cotizacionOriginal.detalles.map(detalle => {
        console.log('📝 Procesando detalle:', {
          servicio: detalle.servicio.nombre,
          precio_usado: detalle.precio_usado,
          subtotal: detalle.subtotal,
          cantidad_equipos: detalle.cantidad_equipos,
          cantidad_anos: detalle.cantidad_anos
        });

        // ✅ CORRECCIÓN: Usar subtotal para calcular precio por equipo
        const subtotalOriginal = parseFloat(detalle.subtotal);
        const precioUnitarioOriginal = parseFloat(detalle.precio_usado); // Este es el precio unitario que puso el vendedor
        const cantidadEquipos = detalle.cantidad_equipos || 1;
        const cantidadAnos = detalle.cantidad_anos || 1;
        const precioMinimo = parseFloat(detalle.servicio.precio_minimo);
        const precioRecomendado = parseFloat(detalle.servicio.precio_recomendado);
        
        // Calcular precio por equipo para el formulario
        // subtotal = precio_usado × cantidad_equipos × cantidad_anos
        // Por lo tanto: precio_por_equipo = subtotal / (cantidad_equipos × cantidad_anos)
        const totalUnidades = cantidadEquipos * cantidadAnos;
        const precioPorEquipo = totalUnidades > 0 
          ? subtotalOriginal / totalUnidades 
          : precioUnitarioOriginal;

        console.log('💰 Cálculo de precio:', {
          subtotal: subtotalOriginal,
          cantidadEquipos: cantidadEquipos,
          cantidadAnos: cantidadAnos,
          totalUnidades: totalUnidades,
          precioPorEquipo: precioPorEquipo,
          formula: `${subtotalOriginal} / (${cantidadEquipos} × ${cantidadAnos}) = ${precioPorEquipo}`
        });

        return {
          id: detalle.servicios_id,
          nombre: detalle.servicio.nombre,
          descripcion: detalle.servicio.descripcion,
          categoria: detalle.servicio.categoria?.nombre || 'Sin categoría',
          
          // Cantidades originales
          cantidadEquipos: detalle.cantidad_equipos || 0,
          cantidadServicios: detalle.cantidad_servicios || 0,
          cantidadGB: detalle.cantidad_gb || 0,
          cantidadAnos: detalle.cantidad_anos || 1,
          
          // Precios - INFORMACIÓN COMPLETA
          precioMinimo: precioMinimo,
          precioRecomendado: precioRecomendado,
          precioUnitarioOriginal: precioUnitarioOriginal, // Precio unitario que puso el vendedor originalmente
          subtotalOriginal: subtotalOriginal, // Total que se cobró (precio_usado × cantidad_equipos × cantidad_anos)
          precioPorEquipo: precioPorEquipo // Precio calculado por equipo para precargar en el formulario
        };
      }),
      
      // Configuración del PDF original
      configuracionPDF: {
        incluirNombreEncargado: cotizacionOriginal.incluir_nombre_encargado,
        incluirNombreEmpresa: cotizacionOriginal.incluir_nombre_empresa,
        incluirDocumentoFiscal: cotizacionOriginal.incluir_documento_fiscal,
        incluirTelefonoEmpresa: cotizacionOriginal.incluir_telefono_empresa,
        incluirCorreoEmpresa: cotizacionOriginal.incluir_correo_empresa,
        tipoPrecioPDF: cotizacionOriginal.tipo_precio_pdf
      },
      
      // Información adicional
      cotizacionOriginal: {
        id: cotizacionOriginal.cotizaciones_id,
        numero: `COT-${new Date().getFullYear()}-${String(cotizacionOriginal.cotizaciones_id).padStart(3, '0')}`,
        total: parseFloat(cotizacionOriginal.total),
        comentario: cotizacionOriginal.comentario
      }
    };

    console.log('✅ Datos para duplicar preparados correctamente');
    console.log('📋 Servicios procesados:', datosParaDuplicar.servicios.length);

    res.json({
      success: true,
      message: 'Datos de cotización obtenidos para duplicar',
      datos: datosParaDuplicar,
      accion: 'redirigir_a_crear' // Indicador para el frontend
    });

  } catch (error) {
    console.error('Error al obtener datos para duplicar:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos para duplicar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

  // Método helper para formatear rol
  formatearRol(tipoUsuario) {
    const roles = {
      'admin': 'Administrador',
      'vendedor': 'Vendedor',
      'super_usuario': 'Supervisor'
    };
    return roles[tipoUsuario] || tipoUsuario;
  }
}

module.exports = VendedorCotizacionController;