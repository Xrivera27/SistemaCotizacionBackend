// controllers/cotizacionController.js
const { Cotizacion, CotizacionDetalle, Cliente, Usuario, Servicio, Categoria, UnidadMedida } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class CotizacionController {
  // 🔧 CORREGIDO: getCotizaciones con relación directa a UnidadMedida
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

      // 🔧 CORREGIDO: Include actualizado con relación directa a UnidadMedida
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
              // 🆕 NUEVO: Include directo de UnidadMedida en CotizacionDetalle
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

      // 🔧 FORMATEO ACTUALIZADO con prioridad a relación directa
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
          // 🔧 CORREGIDO: Usar relación directa primero, fallback a categoria
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

  // 🔧 CORREGIDO: getCotizacionById con nueva estructura
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
              // 🆕 NUEVO: Include directo de UnidadMedida
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

      // 🔧 FORMATEAR DATOS ACTUALIZADO con prioridad a relación directa
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
          // 🔧 CORREGIDO: Usar relación directa primero, fallback a categoria
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

  // Agregar este método en CotizacionController después del método getCotizacionById
async generarPDF(req, res) {
  try {
    const { id } = req.params;
    const { tipo = 'copia' } = req.query;

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
            // 🆕 NUEVO: Include directo para PDF
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

    // ✅ LLAMAR AL MÉTODO ACTUALIZADO CON AGRUPACIÓN
    const pdfBuffer = await this.generarPDFCotizacion(cotizacion, tipo);

    const numeroDocumento = `CT${String(cotizacion.cotizaciones_id).padStart(6, '0')}`;
    const tipoTexto = tipo === 'copia' ? 'Copia' : 'Original';
    const nombreArchivo = `${numeroDocumento}_${tipoTexto}.pdf`;

    // Marcar PDF como generado
    await cotizacion.update({ pdf_generado: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar PDF',
      error: error.message
    });
  }
}
// 🔧 MÉTODO COMPLETO ACTUALIZADO SIGUIENDO LA ESTRUCTURA DE PDFGenerator
async generarPDFCotizacion(cotizacion, tipo) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Configurar colores
      const primaryColor = '#2c3e50';
      const secondaryColor = '#3498db';
      const accentColor = tipo === 'copia' ? '#f39c12' : '#27ae60';

      let yPosition = 50;

      // HEADER MEJORADO
      doc.fontSize(24)
         .fillColor(primaryColor)
         .text('PERDOMO Y ASOCIADOS S. DE R.L', 50, yPosition);

      doc.fontSize(10)
         .fillColor('#7f8c8d')
         .text('Dirección de la empresa: Col. Sauce', 50, yPosition + 30)
         .text('Teléfono: +504 | Email: perdomoyasociados@gmail.com', 50, yPosition + 45)
         .text('www.perdomoyasociados.com', 50, yPosition + 60);

      // Marca de documento (COPIA/ORIGINAL)
      const marcaTexto = tipo === 'copia' ? 'COPIA' : '';
      doc.fontSize(14)
         .fillColor(accentColor)
         .text(marcaTexto, 450, 50, { width: 100, align: 'right' });

      yPosition += 90;

      // Línea separadora moderna
      doc.strokeColor('#ecf0f1')
         .lineWidth(2)
         .moveTo(50, yPosition)
         .lineTo(550, yPosition)
         .stroke();

      yPosition += 20;

      // TÍTULO Y NÚMERO DE COTIZACIÓN CENTRADO
      doc.fontSize(18)
         .fillColor(primaryColor)
         .text('COTIZACIÓN', 50, yPosition, { align: 'center' });

      yPosition += 25;

      const numeroCotizacion = `CT${String(cotizacion.cotizaciones_id).padStart(6, '0')}`;
      doc.fontSize(14)
         .fillColor(secondaryColor)
         .text(numeroCotizacion, 50, yPosition, { align: 'center' });

      yPosition += 40;

      // INFORMACIÓN DEL CLIENTE
      doc.fontSize(12)
         .fillColor(primaryColor)
         .text('DATOS DEL CLIENTE:', 50, yPosition);

      yPosition += 15;

      const incluirInfo = {
        encargado: cotizacion.incluir_nombre_encargado,
        empresa: cotizacion.incluir_nombre_empresa,
        documento: cotizacion.incluir_documento_fiscal,
        telefono: cotizacion.incluir_telefono_empresa,
        correo: cotizacion.incluir_correo_empresa
      };

      doc.fontSize(10).fillColor('#555');

      if (incluirInfo.encargado) {
        doc.text(`Encargado: ${cotizacion.cliente.nombre_encargado}`, 50, yPosition);
        yPosition += 12;
      }

      if (incluirInfo.empresa) {
        doc.text(`Empresa: ${cotizacion.cliente.nombre_empresa}`, 50, yPosition);
        yPosition += 12;
      }

      if (incluirInfo.documento) {
        doc.text(`Documento Fiscal: ${cotizacion.cliente.documento_fiscal}`, 50, yPosition);
        yPosition += 12;
      }

      if (incluirInfo.telefono && cotizacion.cliente.telefono_empresa) {
        doc.text(`Teléfono: ${cotizacion.cliente.telefono_empresa}`, 50, yPosition);
        yPosition += 12;
      }

      if (incluirInfo.correo && cotizacion.cliente.correo_empresa) {
        doc.text(`Email: ${cotizacion.cliente.correo_empresa}`, 50, yPosition);
        yPosition += 12;
      }

      yPosition += 10;

      // INFORMACIÓN GENERAL
      doc.text(`Fecha: ${new Date(cotizacion.fecha_creacion).toLocaleDateString('es-HN')}`, 50, yPosition);
      doc.text(`Vendedor: ${cotizacion.vendedor.nombre_completo}`, 300, yPosition);
      yPosition += 20;

      // Línea separadora
      doc.strokeColor('#ecf0f1')
         .lineWidth(1)
         .moveTo(50, yPosition)
         .lineTo(550, yPosition)
         .stroke();

      yPosition += 20;

      // ✅ NUEVA LÓGICA: SERVICIOS INCLUIDOS CON AGRUPACIÓN POR SERVICIO
      doc.fontSize(12)
         .fillColor(primaryColor)
         .text('SERVICIOS INCLUIDOS:', 50, yPosition);

      yPosition += 20;

      // ✅ AGRUPAR DETALLES POR SERVICIO (IGUAL QUE PDFGenerator)
      const serviciosAgrupados = this._agruparDetallesPorServicio(cotizacion.detalles);
      
      console.log('📊 Servicios agrupados para PDF:', Object.keys(serviciosAgrupados).length);

      let servicioIndex = 1;
      for (const [servicioId, servicioData] of Object.entries(serviciosAgrupados)) {
        // Verificar si necesitamos nueva página
        if (yPosition > 680) {
          doc.addPage();
          yPosition = 50;
        }

        // ✅ NOMBRE DEL SERVICIO
        doc.fontSize(11)
           .fillColor(primaryColor)
           .text(`${servicioIndex}. ${servicioData.nombre}`, 50, yPosition);

        yPosition += 15;

        // ✅ DESCRIPCIÓN DEL SERVICIO
        if (servicioData.descripcion) {
          doc.fontSize(9)
             .fillColor('#666')
             .text(servicioData.descripcion, 70, yPosition, { width: 400 });
          yPosition += 12;
        }

        // ✅ MOSTRAR CADA CATEGORÍA DEL SERVICIO
        const categorias = servicioData.categorias;
        let servicioSubtotal = 0;

        if (categorias.length > 0) {
          console.log(`📋 Procesando ${categorias.length} categorías para ${servicioData.nombre}`);
          
          for (const categoria of categorias) {
            const cantidadTexto = this._formatearCantidadCategoria(categoria);
            const subtotalCategoria = categoria.subtotal || 0;
            servicioSubtotal += subtotalCategoria;

            doc.fontSize(10)
               .fillColor('#495057')
               .text(`• ${cantidadTexto}`, 70, yPosition);

            // Precio de la categoría alineado a la derecha
            doc.text(`$${parseFloat(subtotalCategoria).toLocaleString()}`, 450, yPosition, { 
              width: 100, 
              align: 'right' 
            });

            yPosition += 15;
          }
        }

        yPosition += 20;

        // Línea separadora sutil
        doc.strokeColor('#ecf0f1')
           .lineWidth(0.5)
           .moveTo(50, yPosition)
           .lineTo(550, yPosition)
           .stroke();

        yPosition += 10;
        servicioIndex++;
      }

      // TOTAL CON DISEÑO MODERNO
      yPosition += 10;

      // Caja para el total
      doc.rect(400, yPosition - 5, 150, 25)
         .fillAndStroke('#f8f9fa', '#e9ecef');

      doc.fontSize(14)
         .fillColor('#e74c3c')
         .text('TOTAL:', 410, yPosition);

      doc.text(`$${parseFloat(cotizacion.total).toLocaleString()}`, 450, yPosition, {
        width: 90,
        align: 'right'
      });

      yPosition += 40;

      // CONDICIONES
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(10)
         .fillColor(primaryColor)
         .text('CONDICIONES:', 50, yPosition);

      yPosition += 15;

      doc.fontSize(9)
         .fillColor('#666')
         .text('• Esta cotización tiene validez de 15 días calendario a partir de la fecha de emisión', 50, yPosition)
    .text('• Soporte técnico disponible de lunes a viernes de 8:00 AM a 5:00 PM, sábados de 8:00 AM a 12:00 PM (UTC-6)', 50, yPosition + 12)
    .text('• Los precios cotizados corresponden a la cantidad de equipos especificada. Cualquier variación en el número', 50, yPosition + 24)
    .text('  de equipos al momento de la implementación será facturada según la cantidad real instalada', 50, yPosition + 36)
    .text('• Las visitas técnicas fuera del área metropolitana de La Ceiba generan costos adicionales de traslado', 50, yPosition + 48);

      // FOOTER MODERNO
      doc.fontSize(8)
         .fillColor('#999')
         .text('Para aceptar esta propuesta o solicitar modificaciones, favor confirmar por email o teléfono.', 50, 750)
         .text('¡Gracias por considerar nuestros servicios!', 50, 765);

      // Marca de agua para copias
      if (tipo === 'copia') {
        doc.fontSize(60)
           .fillColor('#f39c12')
           .opacity(0.1)
           .text('COPIA', 200, 400, {
             rotate: -45,
             align: 'center'
           });
      }

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

// ✅ NUEVA FUNCIÓN: Agrupar detalles por servicio (IGUAL QUE PDFGenerator)
_agruparDetallesPorServicio(detalles) {
  const serviciosAgrupados = {};

  console.log('🔍 DEBUG: Agrupando detalles por servicio...');
  
  detalles.forEach((detalle, index) => {
    console.log(`🔍 DEBUG Detalle ${index + 1}:`, {
      servicios_id: detalle.servicios_id,
      servicio_nombre: detalle.servicio?.nombre,
      categorias_id: detalle.categorias_id,
      unidades_medida_id: detalle.unidades_medida_id,
      cantidad: detalle.cantidad,
      unidad_medida: detalle.unidad_medida,
      subtotal: detalle.subtotal
    });

    const servicioId = detalle.servicios_id;
    
    // Inicializar servicio si no existe
    if (!serviciosAgrupados[servicioId]) {
      serviciosAgrupados[servicioId] = {
        servicios_id: servicioId,
        nombre: detalle.servicio?.nombre || 'Servicio sin nombre',
        descripcion: detalle.servicio?.descripcion || '',
        categorias: []
      };
    }
    
    // ✅ AGREGAR CATEGORÍA AL SERVICIO
    const categoriaData = {
      detalles_id: detalle.detalles_id,
      categorias_id: detalle.categorias_id,
      cantidad: detalle.cantidad || 0,
      cantidad_anos: detalle.cantidad_anos || 1,
      precio_usado: detalle.precio_usado || 0,
      subtotal: detalle.subtotal || 0,
      // ✅ UNIDAD DE MEDIDA DIRECTA (prioritaria)
      unidad_medida: detalle.unidad_medida || null,
      // ✅ UNIDAD DE MEDIDA DEL SERVICIO (fallback)
      unidad_medida_servicio: detalle.servicio?.categoria?.unidad_medida || null,
      // ✅ DATOS LEGACY PARA COMPATIBILIDAD
      cantidad_equipos: detalle.cantidad_equipos || 0,
      cantidad_servicios: detalle.cantidad_servicios || 0,
      cantidad_gb: detalle.cantidad_gb || 0
    };

    serviciosAgrupados[servicioId].categorias.push(categoriaData);
  });

  console.log('✅ Servicios agrupados exitosamente:', Object.keys(serviciosAgrupados));
  return serviciosAgrupados;
}

// ✅ NUEVA FUNCIÓN: Formatear cantidad por categoría (IGUAL QUE PDFGenerator)
_formatearCantidadCategoria(categoria) {
  console.log('🔍 DEBUG: Formateando categoría:', categoria);

  const cantidad = categoria.cantidad || 0;
  const años = categoria.cantidad_anos || 1;
  
  // ✅ PRIORIDAD 1: Usar unidad de medida directa del detalle
  let unidadMedida = categoria.unidad_medida;
  
  // ✅ PRIORIDAD 2: Usar unidad de medida del servicio
  if (!unidadMedida && categoria.unidad_medida_servicio) {
    unidadMedida = categoria.unidad_medida_servicio;
    console.log('📋 Usando unidad de medida del servicio como fallback');
  }

  let cantidadTexto = '';

  if (unidadMedida && cantidad > 0) {
    const nombreUnidad = unidadMedida.nombre || 'Unidades';
    const abreviacion = unidadMedida.abreviacion || '';
    const tipoUnidad = unidadMedida.tipo || 'cantidad';
    
    console.log(`📏 Usando unidad: ${nombreUnidad} (${tipoUnidad}) - ${cantidad} ${abreviacion}`);
    
    switch (tipoUnidad) {
      case 'capacidad':
        cantidadTexto = `${nombreUnidad}: ${cantidad} ${abreviacion}`;
        break;
      case 'usuarios':
        cantidadTexto = `${nombreUnidad}: ${cantidad}`;
        break;
      case 'sesiones':
        cantidadTexto = `${nombreUnidad}: ${cantidad}`;
        break;
      case 'tiempo':
        cantidadTexto = `${nombreUnidad}: ${cantidad} ${abreviacion}`;
        break;
      case 'cantidad':
      default:
        cantidadTexto = `${nombreUnidad}: ${cantidad}`;
        break;
    }
  } else {
    // ✅ FALLBACK: Usar datos legacy si no hay unidad de medida
    console.log('⚠️ Sin unidad de medida, usando datos legacy');
    
    if (cantidad > 0) {
      cantidadTexto = `Cantidad: ${cantidad}`;
    } else if (categoria.cantidad_servicios > 0) {
      cantidadTexto = `Servicios: ${categoria.cantidad_servicios}`;
    } else if (categoria.cantidad_gb > 0) {
      cantidadTexto = `Almacenamiento: ${categoria.cantidad_gb} GB`;
    } else {
      cantidadTexto = 'Servicio contratado';
    }
  }

  // ✅ AGREGAR EQUIPOS ADICIONALES SI EXISTEN
  if (categoria.cantidad_equipos > 0) {
    cantidadTexto += ` | Equipos adicionales: ${categoria.cantidad_equipos}`;
  }

  // ✅ AGREGAR AÑOS SIEMPRE
  cantidadTexto += ` | Duración: ${años} año${años > 1 ? 's' : ''}`;

  console.log('✅ Texto final formateado:', cantidadTexto);
  return cantidadTexto;
}
  // Cambiar estado de cotización
  async cambiarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado, motivo_rechazo } = req.body;
      
      const usuarioId = req.user.id;
      const usuarioNombre = req.user.nombre_completo;
      
      console.log('🔍 Debug - Usuario ID:', usuarioId, 'Nombre:', usuarioNombre);

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

      console.log('🔍 Debug - Update Data:', updateData);

      const result = await cotizacion.update(updateData);

      console.log('🔍 Debug - Cotización actualizada:', result.toJSON());

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

  // 🔧 CORREGIDO: getCotizacionesPendientesAprobacion con nueva estructura
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
              // 🆕 NUEVO: Include directo de UnidadMedida
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

      // 🔧 FORMATEAR DATOS ACTUALIZADO con prioridad a relación directa
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
          // 🔧 CORREGIDO: Usar relación directa primero, fallback a categoria
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