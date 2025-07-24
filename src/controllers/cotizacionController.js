// controllers/cotizacionController.js
const { Cotizacion, CotizacionDetalle, Cliente, Usuario, Servicio, Categoria, UnidadMedida } = require('../models');
const { Op } = require('sequelize');
const PDFGenerator = require('../utils/pdfGenerator');
const fs = require('fs');
const path = require('path');

class CotizacionController {
  // Obtener cotizaciones con relación directa a UnidadMedida
  async getCotizaciones(req, res) {
    try {
      const {
        page = 1,
        limit = 25,
        search = '',
        estado = '',
        vendedor = '',
        periodo = ''
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereConditions = {};
      let clienteWhere = {};
      let vendedorWhere = {};

      // Filtro de búsqueda
      if (search) {
        const searchConditions = {
          [Op.or]: [
            { '$cliente.nombre_empresa$': { [Op.like]: `%${search}%` } },
            { '$cliente.nombre_encargado$': { [Op.like]: `%${search}%` } },
            { '$vendedor.nombre_completo$': { [Op.like]: `%${search}%` } }
          ]
        };
        whereConditions = { ...whereConditions, ...searchConditions };
      }

      // Filtro por estado
      if (estado) {
        whereConditions.estado = estado;
      }

      // Filtro por vendedor
      if (vendedor) {
        vendedorWhere.nombre_completo = vendedor;
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

      // Include actualizado con relación directa a UnidadMedida
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
            where: vendedorWhere,
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
                    as: 'categoria',
                    include: [
                      {
                        model: UnidadMedida,
                        as: 'unidad_medida',
                        attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo']
                      }
                    ]
                  }
                ]
              },
              // Include directo de UnidadMedida en CotizacionDetalle
              {
                model: UnidadMedida,
                as: 'unidad_medida',
                attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo']
              }
            ]
          }
        ],
        order: [['fecha_creacion', 'DESC']],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      // Formateo actualizado con prioridad a relación directa
      const cotizacionesFormateadas = cotizaciones.map(cotizacion => {
        const serviciosNombres = cotizacion.detalles.map(detalle => detalle.servicio.nombre);
        
        const serviciosDetalles = cotizacion.detalles.map(detalle => ({
          id: detalle.servicios_id,
          nombre: detalle.servicio.nombre,
          descripcion: detalle.servicio.descripcion,
          categoria: detalle.servicio.categoria?.nombre || 'Sin categoría',
          cantidadEquipos: detalle.cantidad_equipos || 0,
          cantidadServicios: detalle.cantidad_servicios || 0,
          cantidadGB: detalle.cantidad_gb || 0,
          cantidadAnos: detalle.cantidad_anos || 1,
          // Usar relación directa primero, fallback a categoria
          unidadMedida: detalle.unidad_medida ? {
            id: detalle.unidad_medida.unidades_medida_id,
            nombre: detalle.unidad_medida.nombre,
            abreviacion: detalle.unidad_medida.abreviacion,
            tipo: detalle.unidad_medida.tipo
          } : (detalle.servicio.categoria?.unidad_medida ? {
            id: detalle.servicio.categoria.unidad_medida.unidades_medida_id,
            nombre: detalle.servicio.categoria.unidad_medida.nombre,
            abreviacion: detalle.servicio.categoria.unidad_medida.abreviacion,
            tipo: detalle.servicio.categoria.unidad_medida.tipo
          } : null),
          cantidad: detalle.cantidad || 1,
          precioUsado: parseFloat(detalle.precio_usado),
          subtotal: parseFloat(detalle.subtotal)
        }));
        
        return {
          id: cotizacion.cotizaciones_id,
          cliente: {
            nombre: cotizacion.cliente.nombre_empresa,
            email: cotizacion.cliente.correo_empresa || cotizacion.cliente.correo_personal || 'No especificado'
          },
          servicios: serviciosNombres,
          serviciosDetalles: serviciosDetalles,
          fechaCreacion: cotizacion.fecha_creacion,
          vendedor: {
            nombre: cotizacion.vendedor.nombre_completo,
            rol: CotizacionController.formatearRol(cotizacion.vendedor.tipo_usuario)
          },
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

      res.json({
        success: true,
        cotizaciones: cotizacionesFormateadas,
        pagination: pagination
      });

    } catch (error) {
      console.error('Error al obtener cotizaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener estadísticas de cotizaciones
  async getEstadisticas(req, res) {
    try {
      // Contar por estado
      const estadisticasEstado = await Cotizacion.findAll({
        attributes: [
          'estado',
          [Cotizacion.sequelize.fn('COUNT', Cotizacion.sequelize.col('estado')), 'cantidad']
        ],
        group: ['estado']
      });

      // Contar vendedores activos
      const vendedoresActivos = await Usuario.count({
        include: [{
          model: Cotizacion,
          as: 'cotizaciones',
          required: true
        }],
        distinct: true
      });

      // Formatear estadísticas
      const stats = {
        total: 0,
        esperando: 0,
        pendientes: 0,
        efectivas: 0,
        rechazadas: 0,
        vendedoresActivos: vendedoresActivos
      };

      estadisticasEstado.forEach(stat => {
        const cantidad = parseInt(stat.dataValues.cantidad);
        stats.total += cantidad;

        switch (stat.estado) {
          case 'pendiente_aprobacion':
            stats.esperando = cantidad;
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

      res.json({
        success: true,
        estadisticas: stats
      });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // getCotizacionById con nueva estructura
  async getCotizacionById(req, res) {
    try {
      const { id } = req.params;

      const cotizacion = await Cotizacion.findByPk(id, {
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
                    as: 'categoria',
                    include: [
                      {
                        model: UnidadMedida,
                        as: 'unidad_medida',
                        attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo']
                      }
                    ]
                  }
                ]
              },
              // Include directo de UnidadMedida
              {
                model: UnidadMedida,
                as: 'unidad_medida',
                attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo']
              }
            ]
          }
        ]
      });

      if (!cotizacion) {
        return res.status(404).json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }

      // Buscar información de auditoría
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

      // Formatear datos actualizado con prioridad a relación directa
      const cotizacionFormateada = {
        id: cotizacion.cotizaciones_id,
        cliente: {
          nombre: cotizacion.cliente.nombre_empresa,
          email: cotizacion.cliente.correo_empresa || cotizacion.cliente.correo_personal || 'No especificado',
          encargado: cotizacion.cliente.nombre_encargado,
          telefono: cotizacion.cliente.telefono_empresa,
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
          // Usar relación directa primero, fallback a categoria
          unidadMedida: detalle.unidad_medida ? {
            id: detalle.unidad_medida.unidades_medida_id,
            nombre: detalle.unidad_medida.nombre,
            abreviacion: detalle.unidad_medida.abreviacion,
            tipo: detalle.unidad_medida.tipo
          } : (detalle.servicio.categoria?.unidad_medida ? {
            id: detalle.servicio.categoria.unidad_medida.unidades_medida_id,
            nombre: detalle.servicio.categoria.unidad_medida.nombre,
            abreviacion: detalle.servicio.categoria.unidad_medida.abreviacion,
            tipo: detalle.servicio.categoria.unidad_medida.tipo
          } : null),
          cantidad: detalle.cantidad || 1,
          precioUsado: parseFloat(detalle.precio_usado),
          subtotal: parseFloat(detalle.subtotal)
        })),
        fechaCreacion: cotizacion.fecha_creacion,
        vendedor: {
          nombre: cotizacion.vendedor.nombre_completo,
          rol: CotizacionController.formatearRol(cotizacion.vendedor.tipo_usuario)
        },
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
        // Información de auditoría
        auditoria: {
          aprobadoPor: usuarioAprobador ? {
            id: usuarioAprobador.usuarios_id,
            nombre: usuarioAprobador.nombre_completo,
            rol: CotizacionController.formatearRol(usuarioAprobador.tipo_usuario)
          } : null,
          aprobadoPorNombre: cotizacion.aprobado_por_nombre,
          fechaAprobacion: cotizacion.fecha_aprobacion,
          rechazadoPor: usuarioRechazador ? {
            id: usuarioRechazador.usuarios_id,
            nombre: usuarioRechazador.nombre_completo,
            rol: CotizacionController.formatearRol(usuarioRechazador.tipo_usuario)
          } : null,
          rechazadoPorNombre: cotizacion.rechazado_por_nombre,
          fechaRechazo: cotizacion.fecha_rechazo
        }
      };

      res.json({
        success: true,
        cotizacion: cotizacionFormateada
      });

    } catch (error) {
      console.error('Error al obtener cotización:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Usar PDFGenerator en lugar de método interno
  async generarPDF(req, res) {
    try {
      const { id } = req.params;
      const { tipo = 'original' } = req.query;

      const cotizacion = await Cotizacion.findByPk(id, {
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
                    as: 'categoria',
                    include: [
                      {
                        model: UnidadMedida,
                        as: 'unidad_medida',
                        attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo']
                      }
                    ]
                  }
                ]
              },
              // Include directo para PDF
              {
                model: UnidadMedida,
                as: 'unidad_medida',
                attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo']
              }
            ]
          }
        ]
      });

      if (!cotizacion) {
        return res.status(404).json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }

      const pdfBuffer = await PDFGenerator.generarCotizacionPDF(cotizacion, tipo);

      const numeroDocumento = `CT${String(cotizacion.cotizaciones_id).padStart(6, '0')}`;
      
      // Permitir que el admin especifique si es copia u original
      let tipoTexto = '';
      if (tipo === 'copia') {
        tipoTexto = '_Copia';
      } else if (tipo === 'original') {
        tipoTexto = '_Original';
      }
      
      const nombreArchivo = `${numeroDocumento}${tipoTexto}.pdf`;

      // Marcar PDF como generado
      await cotizacion.update({ pdf_generado: true });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar PDF',
        error: error.message
      });
    }
  }

  // Cambiar estado de cotización
  async cambiarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado, motivo_rechazo } = req.body;
      
      const usuarioId = req.user.id;
      const usuarioNombre = req.user.nombre_completo;

      const estadosValidos = ['pendiente', 'pendiente_aprobacion', 'aprobado', 'rechazado', 'efectiva', 'rechazada'];
      
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado no válido'
        });
      }

      const cotizacion = await Cotizacion.findByPk(id);
      if (!cotizacion) {
        return res.status(404).json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }

      const updateData = { estado };

      switch (estado) {
        case 'aprobado':
          if (cotizacion.estado === 'pendiente_aprobacion') {
            updateData.estado = 'pendiente';
            updateData.aprobado_por = usuarioId;
            updateData.aprobado_por_nombre = usuarioNombre;
            updateData.fecha_aprobacion = new Date();
            updateData.rechazado_por = null;
            updateData.rechazado_por_nombre = null;
            updateData.fecha_rechazo = null;
          } else {
            updateData.estado = cotizacion.estado;
          }
          break;

        case 'rechazado':
          if (cotizacion.estado === 'pendiente_aprobacion') {
            updateData.estado = 'rechazada';
            updateData.rechazado_por = usuarioId;
            updateData.rechazado_por_nombre = usuarioNombre;
            updateData.fecha_rechazo = new Date();
            if (motivo_rechazo && motivo_rechazo.trim()) {
              updateData.comentario = motivo_rechazo.trim();
            }
            updateData.aprobado_por = null;
            updateData.aprobado_por_nombre = null;
            updateData.fecha_aprobacion = null;
          } else if (cotizacion.estado === 'pendiente') {
            updateData.estado = 'rechazada';
            updateData.rechazado_por = usuarioId;
            updateData.rechazado_por_nombre = usuarioNombre;
            updateData.fecha_rechazo = new Date();
            if (motivo_rechazo && motivo_rechazo.trim()) {
              updateData.comentario = motivo_rechazo.trim();
            }
            updateData.aprobado_por = null;
            updateData.aprobado_por_nombre = null;
            updateData.fecha_aprobacion = null;
          } else {
            updateData.estado = cotizacion.estado;
          }
          break;

        case 'efectiva':
          if (cotizacion.estado === 'pendiente') {
            updateData.estado = 'efectiva';
            updateData.aprobado_por = usuarioId;
            updateData.aprobado_por_nombre = usuarioNombre;
            updateData.fecha_aprobacion = new Date();
            updateData.rechazado_por = null;
            updateData.rechazado_por_nombre = null;
            updateData.fecha_rechazo = null;
          } else {
            updateData.estado = cotizacion.estado;
          }
          break;

        case 'rechazada':
          updateData.estado = 'rechazada';
          updateData.rechazado_por = usuarioId;
          updateData.rechazado_por_nombre = usuarioNombre;
          updateData.fecha_rechazo = new Date();
          if (motivo_rechazo && motivo_rechazo.trim()) {
            updateData.comentario = motivo_rechazo.trim();
          }
          updateData.aprobado_por = null;
          updateData.aprobado_por_nombre = null;
          updateData.fecha_aprobacion = null;
          break;

        case 'pendiente':
          updateData.estado = 'pendiente';
          break;

        case 'pendiente_aprobacion':
          updateData.estado = 'pendiente_aprobacion';
          break;

        default:
          updateData.estado = cotizacion.estado;
          break;
      }

      const result = await cotizacion.update(updateData);

      let mensaje = '';
      const estadoAnterior = cotizacion.estado;
      const estadoNuevo = updateData.estado;

      if (estado === 'aprobado' && estadoAnterior === 'pendiente_aprobacion' && estadoNuevo === 'pendiente') {
        mensaje = 'Cotización aprobada exitosamente. Ahora está pendiente de respuesta del cliente.';
      } else if (estado === 'rechazado' && estadoAnterior === 'pendiente_aprobacion' && estadoNuevo === 'rechazada') {
        mensaje = 'Cotización rechazada exitosamente.';
      } else if (estado === 'rechazado' && estadoAnterior === 'pendiente' && estadoNuevo === 'rechazada') {
        mensaje = 'Cotización cancelada exitosamente.';
      } else if (estado === 'efectiva' && estadoAnterior === 'pendiente' && estadoNuevo === 'efectiva') {
        mensaje = 'Cotización marcada como efectiva exitosamente.';
      } else if (estadoAnterior !== estadoNuevo) {
        mensaje = `Estado cambiado de ${estadoAnterior} a ${estadoNuevo} exitosamente.`;
      } else {
        mensaje = 'Estado actualizado exitosamente.';
      }

      res.json({
        success: true,
        message: mensaje,
        cotizacion: {
          id: cotizacion.cotizaciones_id,
          estadoAnterior: estadoAnterior,
          estadoNuevo: estadoNuevo,
          auditoria: {
            aprobadoPor: updateData.aprobado_por ? {
              id: updateData.aprobado_por,
              nombre: updateData.aprobado_por_nombre
            } : null,
            fechaAprobacion: updateData.fecha_aprobacion,
            rechazadoPor: updateData.rechazado_por ? {
              id: updateData.rechazado_por,
              nombre: updateData.rechazado_por_nombre
            } : null,
            fechaRechazo: updateData.fecha_rechazo
          },
          comentario: updateData.comentario
        }
      });

    } catch (error) {
      console.error('Error al cambiar estado:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // getCotizacionesPendientesAprobacion con nueva estructura
  async getCotizacionesPendientesAprobacion(req, res) {
    try {
      const {
        page = 1,
        limit = 25,
        search = ''
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereConditions = {
        estado: 'pendiente_aprobacion'
      };
      
      // Filtro de búsqueda
      if (search) {
        const searchConditions = {
          [Op.or]: [
            { '$cliente.nombre_empresa$': { [Op.like]: `%${search}%` } },
            { '$cliente.nombre_encargado$': { [Op.like]: `%${search}%` } },
            { '$vendedor.nombre_completo$': { [Op.like]: `%${search}%` } }
          ]
        };
        whereConditions = { ...whereConditions, ...searchConditions };
      }

      const { count, rows: cotizaciones } = await Cotizacion.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Cliente,
            as: 'cliente',
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
                    as: 'categoria',
                    include: [
                      {
                        model: UnidadMedida,
                        as: 'unidad_medida',
                        attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo']
                      }
                    ]
                  }
                ]
              },
              // Include directo de UnidadMedida
              {
                model: UnidadMedida,
                as: 'unidad_medida',
                attributes: ['unidades_medida_id', 'nombre', 'abreviacion', 'tipo']
              }
            ]
          }
        ],
        order: [['fecha_creacion', 'ASC']],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      // Formatear datos actualizado con prioridad a relación directa
      const cotizacionesFormateadas = cotizaciones.map(cotizacion => {
        const serviciosDetalles = cotizacion.detalles.map(detalle => ({
          id: detalle.servicios_id,
          nombre: detalle.servicio.nombre,
          descripcion: detalle.servicio.descripcion,
          categoria: detalle.servicio.categoria?.nombre || 'Sin categoría',
          cantidadEquipos: detalle.cantidad_equipos || 0,
          cantidadServicios: detalle.cantidad_servicios ||0,
          cantidadGB: detalle.cantidad_gb || 0,
          cantidadAnos: detalle.cantidad_anos || 1,
          // Usar relación directa primero, fallback a categoria
          unidadMedida: detalle.unidad_medida ? {
            id: detalle.unidad_medida.unidades_medida_id,
            nombre: detalle.unidad_medida.nombre,
            abreviacion: detalle.unidad_medida.abreviacion,
            tipo: detalle.unidad_medida.tipo
          } : (detalle.servicio.categoria?.unidad_medida ? {
            id: detalle.servicio.categoria.unidad_medida.unidades_medida_id,
            nombre: detalle.servicio.categoria.unidad_medida.nombre,
            abreviacion: detalle.servicio.categoria.unidad_medida.abreviacion,
            tipo: detalle.servicio.categoria.unidad_medida.tipo
          } : null),
          cantidad: detalle.cantidad || 1,
          precioUsado: parseFloat(detalle.precio_usado),
          subtotal: parseFloat(detalle.subtotal),
          // Agregar precios de referencia para comparación
          precioMinimo: parseFloat(detalle.servicio.precio_minimo),
         precioRecomendado: parseFloat(detalle.servicio.precio_recomendado)
       }));

       return {
         id: cotizacion.cotizaciones_id,
         cliente: {
           nombre: cotizacion.cliente.nombre_empresa,
           encargado: cotizacion.cliente.nombre_encargado,
           email: cotizacion.cliente.correo_empresa || cotizacion.cliente.correo_personal || 'No especificado'
         },
         serviciosDetalles: serviciosDetalles,
         fechaCreacion: cotizacion.fecha_creacion,
         vendedor: {
           nombre: cotizacion.vendedor.nombre_completo,
           rol: CotizacionController.formatearRol(cotizacion.vendedor.tipo_usuario)
         },
         estado: cotizacion.estado,
         total: parseFloat(cotizacion.total),
         comentario: cotizacion.comentario,
         // Indicador de urgencia (días esperando aprobación)
         diasEspera: Math.floor((new Date() - new Date(cotizacion.fecha_creacion)) / (1000 * 60 * 60 * 24))
       };
     });

     const totalPages = Math.ceil(count / parseInt(limit));
     const pagination = {
       currentPage: parseInt(page),
       totalPages: totalPages,
       totalItems: count,
       itemsPerPage: parseInt(limit),
       hasNextPage: parseInt(page) < totalPages,
       hasPrevPage: parseInt(page) > 1
     };

     res.json({
       success: true,
       cotizaciones: cotizacionesFormateadas,
       pagination: pagination
     });

   } catch (error) {
     console.error('Error al obtener cotizaciones pendientes:', error);
     res.status(500).json({
       success: false,
       message: 'Error interno del servidor',
       error: error.message
     });
   }
 }

 // Estadísticas específicas para SuperUsuario
 async getEstadisticasSuper(req, res) { 
   try {
     // Estadísticas generales
     const estadisticasEstado = await Cotizacion.findAll({
       attributes: [
         'estado',
         [Cotizacion.sequelize.fn('COUNT', Cotizacion.sequelize.col('estado')), 'cantidad']
       ],
       group: ['estado']
     });

     // Cotizaciones pendientes de aprobación con urgencia
     const pendientesAprobacion = await Cotizacion.findAll({
       where: { estado: 'pendiente_aprobacion' },
       attributes: [
         'cotizaciones_id',
         'fecha_creacion',
         [Cotizacion.sequelize.literal('DATEDIFF(NOW(), fecha_creacion)'), 'dias_espera']
       ],
       order: [['fecha_creacion', 'ASC']]
     });

     // Formatear estadísticas
     const stats = {
       total: 0,
       pendientesAprobacion: 0,
       pendientes: 0,
       aprobadas: 0,
       rechazadas: 0,
       urgentes: 0 // Más de 3 días esperando aprobación
     };

     estadisticasEstado.forEach(stat => {
       const cantidad = parseInt(stat.dataValues.cantidad);
       stats.total += cantidad;

       switch (stat.estado) {
         case 'pendiente_aprobacion':
           stats.pendientesAprobacion = cantidad;
           break;
         case 'pendiente':
           stats.pendientes = cantidad;
           break;
         case 'efectiva':
           stats.aprobadas = cantidad;
           break;
         case 'rechazada':
           stats.rechazadas = cantidad;
           break;
       }
     });

     // Contar urgentes (más de 3 días)
     stats.urgentes = pendientesAprobacion.filter(p => p.dataValues.dias_espera > 3).length;

     res.json({
       success: true,
       estadisticas: stats,
       pendientesDetalle: pendientesAprobacion.map(p => ({
         id: p.cotizaciones_id,
         diasEspera: p.dataValues.dias_espera
       }))
     });

   } catch (error) {
     console.error('Error al obtener estadísticas super:', error);
     res.status(500).json({
       success: false,
       message: 'Error interno del servidor',
       error: error.message
     });
   }
 }

 // Obtener lista de vendedores únicos
 async getVendedores(req, res) {
   try {
     const vendedores = await Usuario.findAll({
       attributes: ['nombre_completo'],
       include: [{
         model: Cotizacion,
         as: 'cotizaciones',
         required: true,
         attributes: []
       }],
       group: ['usuarios_id', 'nombre_completo'],
       order: [['nombre_completo', 'ASC']]
     });

     const vendedoresUnicos = vendedores.map(v => v.nombre_completo);

     res.json({
       success: true,
       vendedores: vendedoresUnicos
     });

   } catch (error) {
     console.error('Error al obtener vendedores:', error);
     res.status(500).json({
       success: false,
       message: 'Error interno del servidor',
       error: error.message
     });
   }
 }

 // Método helper para formatear rol
 static formatearRol(tipoUsuario) {
   const roles = {
     'admin': 'Administrador',
     'vendedor': 'Vendedor',
     'super_usuario': 'Supervisor'
   };
   return roles[tipoUsuario] || tipoUsuario;
 }
}

module.exports = CotizacionController;