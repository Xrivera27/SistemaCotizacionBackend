// controllers/cotizacionController.js
const { Cotizacion, CotizacionDetalle, Cliente, Usuario, Servicio, Categoria } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class CotizacionController {
  // Obtener todas las cotizaciones con filtros y paginación
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

      // 🆕 FORMATEAR DATOS CORREGIDO - INCLUYE CANTIDAD_ANOS
      const cotizacionesFormateadas = cotizaciones.map(cotizacion => {
        // Mantener compatibilidad: array de nombres para servicios básicos
        const serviciosNombres = cotizacion.detalles.map(detalle => detalle.servicio.nombre);
        
        // Agregar detalles completos de servicios CON cantidad_anos
        const serviciosDetalles = cotizacion.detalles.map(detalle => ({
          id: detalle.servicios_id,
          nombre: detalle.servicio.nombre,
          descripcion: detalle.servicio.descripcion,
          categoria: detalle.servicio.categoria?.nombre || 'Sin categoría',
          cantidadEquipos: detalle.cantidad_equipos || 0,
          cantidadServicios: detalle.cantidad_servicios || 0,
          cantidadGB: detalle.cantidad_gb || 0,
          cantidadAnos: detalle.cantidad_anos || 1,  // 🆕 CAMPO CANTIDAD AÑOS
          precioUsado: parseFloat(detalle.precio_usado),
          subtotal: parseFloat(detalle.subtotal)
        }));
        
        return {
          id: cotizacion.cotizaciones_id,
          cliente: {
            nombre: cotizacion.cliente.nombre_empresa,
            email: cotizacion.cliente.correo_empresa || cotizacion.cliente.correo_personal || 'No especificado'
          },
          servicios: serviciosNombres, // Para compatibilidad
          serviciosDetalles: serviciosDetalles, // 🆕 DETALLES COMPLETOS CON AÑOS
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

  // Obtener una cotización específica
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
          message: 'Cotización no encontrada'
        });
      }

      // Formatear datos para el frontend
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
          cantidadAnos: detalle.cantidad_anos || 1,  // 🆕 INCLUIR AÑOS
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

  // Generar PDF de cotización
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
          message: 'Cotización no encontrada'
        });
      }

      const pdfBuffer = await CotizacionController.prototype.generarPDFCotizacion.call(this, cotizacion, tipo);

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

  // Cambiar estado de cotización
  async cambiarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado, motivo_rechazo } = req.body;

      const estadosValidos = ['pendiente', 'pendiente_aprobacion', 'efectiva', 'rechazada'];
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

      // Solo actualizar los campos que existen en la BD
      const updateData = { 
        estado
      };

      // Si se rechaza y hay motivo, guardarlo en comentario
      if (estado === 'rechazada' && motivo_rechazo) {
        updateData.comentario = motivo_rechazo;
      }

      await cotizacion.update(updateData);

      res.json({
        success: true,
        message: `Cotización ${estado} exitosamente`
      });

    } catch (error) {
      console.error('Error al cambiar estado:', error);
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

  // 🆕 MÉTODO CORREGIDO PARA GENERAR PDF CON AÑOS
  async generarPDFCotizacion(cotizacion, tipo) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Configurar colores y fuentes
        const primaryColor = '#2c3e50';
        const secondaryColor = '#3498db';
        const accentColor = tipo === 'copia' ? '#f39c12' : '#27ae60';

        // HEADER
        doc.fontSize(24)
           .fillColor(primaryColor)
           .text('EMPRESA SERVICIOS', 50, 50);

        doc.fontSize(10)
           .fillColor('#7f8c8d')
           .text('Dirección de la empresa', 50, 80)
           .text('Teléfono: +504 1234-5678 | Email: contacto@empresa.com', 50, 95)
           .text('www.empresaservicios.com', 50, 110);

        // Marca de documento (COPIA/ORIGINAL)
        const marcaTexto = tipo === 'copia' ? 'COPIA' : 'ORIGINAL';
        doc.fontSize(14)
           .fillColor(accentColor)
           .text(marcaTexto, 450, 50, { width: 100, align: 'right' });

        // Línea separadora
        doc.strokeColor('#ecf0f1')
           .lineWidth(2)
           .moveTo(50, 140)
           .lineTo(550, 140)
           .stroke();

        // TÍTULO Y NÚMERO DE COTIZACIÓN
        doc.fontSize(18)
           .fillColor(primaryColor)
           .text('COTIZACIÓN', 50, 160, { align: 'center' });

        const numeroCotizacion = `CT${String(cotizacion.cotizaciones_id).padStart(6, '0')}`;
        doc.fontSize(14)
           .fillColor(secondaryColor)
           .text(numeroCotizacion, 50, 185, { align: 'center' });

        let yPosition = 220;

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

        // SERVICIOS
        doc.fontSize(12)
           .fillColor(primaryColor)
           .text('SERVICIOS INCLUIDOS:', 50, yPosition);

        yPosition += 20;

        cotizacion.detalles.forEach((detalle, index) => {
          // Verificar si necesitamos nueva página
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }

          // Nombre del servicio
          doc.fontSize(11)
             .fillColor(primaryColor)
             .text(`${index + 1}. ${detalle.servicio.nombre}`, 50, yPosition);

          yPosition += 15;

          // Descripción
          doc.fontSize(9)
             .fillColor('#666')
             .text(detalle.servicio.descripcion || 'Sin descripción', 70, yPosition, { width: 400 });

          yPosition += 12;

          // 🆕 CANTIDADES CORREGIDAS - INCLUYE AÑOS
          let cantidadTexto = '';
          
          if (detalle.cantidad_equipos > 0) {
            cantidadTexto += `Equipos: ${detalle.cantidad_equipos}`;
          }
          
          if (detalle.cantidad_servicios > 0) {
            if (cantidadTexto) cantidadTexto += ' | ';
            cantidadTexto += `Servicios: ${detalle.cantidad_servicios}`;
          }
          
          if (detalle.cantidad_gb > 0) {
            if (cantidadTexto) cantidadTexto += ' | ';
            cantidadTexto += `GB: ${detalle.cantidad_gb}`;
          }
          
          // 🆕 MOSTRAR AÑOS - SIEMPRE MOSTRAR, NO SOLO SI ES > 1
          const anos = detalle.cantidad_anos || 1;
          if (cantidadTexto) cantidadTexto += ' | ';
          cantidadTexto += `Años: ${anos}`;

          doc.fontSize(10)
             .fillColor(primaryColor)
             .text(cantidadTexto, 70, yPosition);

          // Precio alineado a la derecha
          doc.text(`$${parseFloat(detalle.subtotal).toLocaleString()}`, 450, yPosition, { 
            width: 100, 
            align: 'right' 
          });

          yPosition += 20;

          // Línea separadora
          doc.strokeColor('#ecf0f1')
             .lineWidth(0.5)
             .moveTo(50, yPosition)
             .lineTo(550, yPosition)
             .stroke();

          yPosition += 10;
        });

        // TOTAL
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
           .text('• Esta cotización es válida por 30 días a partir de la fecha de emisión', 50, yPosition)
           .text('• Precios incluyen soporte técnico 24/7', 50, yPosition + 12)
           .text('• Los servicios se activarán dentro de 48 horas después de la confirmación', 50, yPosition + 24);

        // FOOTER
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