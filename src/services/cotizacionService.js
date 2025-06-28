// services/cotizacionService.js
const { Cotizacion, CotizacionDetalle, Cliente, Servicio, Usuario, Categoria } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class CotizacionService {
  
  // Crear nueva cotización
async createCotizacion(data) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('📝 Iniciando creación de cotización...');
    
    const { cliente, servicios, añosContrato, precioTotal, tipoPrecio, configuracionPDF, comentario, usuarios_id } = data;
    
    // ✅ AGREGAR DEBUG
    console.log('🏢 Datos del cliente recibidos:', cliente);
    console.log('🔍 Cliente ID recibido:', cliente.clientes_id);
    
    // 1. Crear o actualizar cliente
    let clienteRecord;
    if (cliente.clientes_id) {
      console.log('✅ Buscando cliente existente con ID:', cliente.clientes_id);
      // Cliente existente - verificar que pertenece al vendedor
      clienteRecord = await Cliente.findOne({
        where: {
          clientes_id: cliente.clientes_id,
          usuarios_id: usuarios_id
        },
        transaction
      });
      
      if (!clienteRecord) {
        console.log('❌ Cliente no encontrado con ID:', cliente.clientes_id);
        await transaction.rollback();
        return {
          success: false,
          message: 'Cliente no encontrado o no tienes permisos para usarlo'
        };
      }
      
      console.log('✅ Cliente existente encontrado:', clienteRecord.nombre_empresa);
      
      // Actualizar datos del cliente si se proporcionan
      if (cliente.nombreEncargado || cliente.nombreEmpresa) {
        console.log('🔄 Actualizando datos del cliente existente...');
        await clienteRecord.update({
          nombre_encargado: cliente.nombreEncargado || clienteRecord.nombre_encargado,
          telefono_personal: cliente.telefonoPersonal || clienteRecord.telefono_personal,
          telefono_empresa: cliente.telefonoEmpresa || clienteRecord.telefono_empresa,
          nombre_empresa: cliente.nombreEmpresa || clienteRecord.nombre_empresa,
          documento_fiscal: cliente.documentofiscal || clienteRecord.documento_fiscal,
          correo_personal: cliente.correoPersonal || clienteRecord.correo_personal,
          correo_empresa: cliente.correoEmpresa || clienteRecord.correo_empresa
        }, { transaction });
        console.log('✅ Cliente actualizado exitosamente');
      }
    } else {
      console.log('🆕 Creando nuevo cliente...');
      // Crear nuevo cliente
      clienteRecord = await Cliente.create({
        nombre_encargado: cliente.nombreEncargado,
        telefono_personal: cliente.telefonoPersonal || null,
        telefono_empresa: cliente.telefonoEmpresa || null,
        nombre_empresa: cliente.nombreEmpresa,
        documento_fiscal: cliente.documentofiscal,
        correo_personal: cliente.correoPersonal || null,
        correo_empresa: cliente.correoEmpresa || null,
        usuarios_id: usuarios_id
      }, { transaction });
      console.log('✅ Nuevo cliente creado con ID:', clienteRecord.clientes_id);
    }
    
    // 2. Validar servicios y precios
    console.log('🔍 Validando servicios...');
    const serviciosValidados = [];
    let requiereAprobacion = false;
    
    for (const servicioItem of servicios) {
      const servicio = await Servicio.findByPk(
        servicioItem.servicio.servicios_id || servicioItem.servicio.id,
        {
          include: [{ model: Categoria, as: 'categoria' }],
          transaction
        }
      );
      
      if (!servicio) {
        console.log('❌ Servicio no encontrado:', servicioItem.servicio.servicios_id || servicioItem.servicio.id);
        await transaction.rollback();
        return {
          success: false,
          message: `Servicio con ID ${servicioItem.servicio.servicios_id || servicioItem.servicio.id} no encontrado`
        };
      }
      
      // Verificar si el precio está por debajo del mínimo
      if (servicioItem.precioVentaFinal < servicio.precio_minimo) {
        console.log('⚠️ Precio por debajo del mínimo detectado para:', servicio.nombre);
        requiereAprobacion = true;
      }
      
      // Calcular cantidades según el tipo de servicio
      let cantidadEquipos = 0;
      let cantidadServicios = 0;
      let cantidadGB = 0;
      
      // Para servicios de backup, cantidadServidores representa GB
      const esBackup = servicio.categoria && 
        (servicio.categoria.nombre === 'backup' || servicio.categoria.nombre === 'respaldo');
      
      if (esBackup) {
        cantidadGB = servicioItem.cantidadServidores || 0;
        cantidadServicios = cantidadGB; // Para el cálculo
        console.log(`📦 Servicio backup: ${servicio.nombre} - ${cantidadGB} GB`);
      } else {
        cantidadServicios = servicioItem.cantidadServidores || 0;
        cantidadEquipos = servicioItem.cantidadEquipos || 0;
        console.log(`⚙️ Servicio normal: ${servicio.nombre} - ${cantidadServicios} servicios, ${cantidadEquipos} equipos`);
      }
      
      const totalUnidades = cantidadServicios + cantidadEquipos;
      const subtotal = servicioItem.precioVentaFinal * totalUnidades * añosContrato;
      
      serviciosValidados.push({
        servicios_id: servicio.servicios_id,
        cantidad_equipos: cantidadEquipos,
        cantidad_servicios: cantidadServicios,
        cantidad_gb: cantidadGB,
        cantidad_anos: añosContrato,
        precio_usado: servicioItem.precioVentaFinal,
        subtotal: subtotal
      });
    }
    
    console.log(`✅ ${serviciosValidados.length} servicios validados`);
    
    // 3. Determinar estado de la cotización
    const estado = requiereAprobacion ? 'pendiente_aprobacion' : 'pendiente';
    console.log('📋 Estado de la cotización:', estado);
    
    // 4. Crear cotización
console.log('💾 Creando cotización...');
const nuevaCotizacion = await Cotizacion.create({
  clientes_id: clienteRecord.clientes_id,
  usuarios_id: usuarios_id,
  total: precioTotal,
  comentario: comentario || null,
  estado: estado,
  // ✅ CORREGIDO: Si requiere aprobación, marcar PDF como generado automáticamente
  pdf_generado: requiereAprobacion ? true : false,
  incluir_nombre_encargado: configuracionPDF?.incluirNombreEncargado || false,
  incluir_nombre_empresa: configuracionPDF?.incluirNombreEmpresa || false,
  incluir_documento_fiscal: configuracionPDF?.incluirDocumentoFiscal || false,
  incluir_telefono_empresa: configuracionPDF?.incluirTelefonoEmpresa || false,
  incluir_correo_empresa: configuracionPDF?.incluirCorreoEmpresa || false,
  tipo_precio_pdf: tipoPrecio || 'venta'
}, { transaction });

// ✅ AGREGAR LOG
if (requiereAprobacion) {
  console.log('📋 Cotización pendiente_aprobacion: PDF marcado como generado automáticamente');
} else {
  console.log('💾 Cotización normal: PDF se generará cuando el usuario lo solicite');
}
    
    // 5. Crear detalles de la cotización
    console.log('📝 Creando detalles de la cotización...');
    await CotizacionDetalle.bulkCreate(
      serviciosValidados.map(detalle => ({
        ...detalle,
        cotizaciones_id: nuevaCotizacion.cotizaciones_id
      })),
      { transaction }
    );
    
    console.log('✅ Detalles de la cotización creados');
    
    await transaction.commit();
    
    console.log('✅ Cotización creada exitosamente');
    
    const message = requiereAprobacion 
      ? 'Cotización creada y enviada para aprobación debido a precios por debajo del mínimo'
      : 'Cotización creada exitosamente';
    
    return {
      success: true,
      message: message,
      cotizacion: nuevaCotizacion,
      requiere_aprobacion: requiereAprobacion
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en createCotizacion:', error);
    throw error;
  }
}
  
  // Obtener cotizaciones con filtros
  async getCotizaciones(filters) {
    try {
      console.log('📝 Obteniendo cotizaciones con filtros:', filters);
      
      const {
        page = 1,
        limit = 10,
        estado,
        fechaInicio,
        fechaFin,
        busqueda,
        usuarios_id
      } = filters;
      
      const offset = (page - 1) * limit;
      
      // Construir condiciones WHERE
      const whereConditions = {};
      
      if (usuarios_id) {
        whereConditions.usuarios_id = usuarios_id;
      }
      
      if (estado) {
        whereConditions.estado = estado;
      }
      
      if (fechaInicio && fechaFin) {
        whereConditions.fecha_creacion = {
          [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
        };
      }
      
      // Incluir búsqueda en cliente
      const includeConditions = [
        {
          model: Cliente,
          as: 'cliente',
          where: busqueda ? {
            [Op.or]: [
              { nombre_encargado: { [Op.like]: `%${busqueda}%` } },
              { nombre_empresa: { [Op.like]: `%${busqueda}%` } },
              { documento_fiscal: { [Op.like]: `%${busqueda}%` } }
            ]
          } : undefined
        },
        {
          model: Usuario,
          as: 'vendedor',
          attributes: ['usuarios_id', 'nombre_completo', 'correo']
        }
      ];
      
      const cotizaciones = await Cotizacion.findAndCountAll({
        where: whereConditions,
        include: includeConditions,
        limit: parseInt(limit),
        offset: offset,
        order: [['fecha_creacion', 'DESC']]
      });
      
      console.log(`✅ ${cotizaciones.count} cotizaciones encontradas`);
      
      return {
        success: true,
        cotizaciones: cotizaciones.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(cotizaciones.count / limit),
          totalItems: cotizaciones.count,
          itemsPerPage: parseInt(limit)
        }
      };
      
    } catch (error) {
      console.error('❌ Error en getCotizaciones:', error);
      throw error;
    }
  }
  
  // Obtener cotización por ID con todos los detalles
  async getCotizacionById(id) {
    try {
      console.log('📝 Obteniendo cotización por ID:', id);
      
      const cotizacion = await Cotizacion.findByPk(id, {
        include: [
          {
            model: Cliente,
            as: 'cliente'
          },
          {
            model: Usuario,
            as: 'vendedor',
            attributes: ['usuarios_id', 'nombre_completo', 'correo']
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
        return {
          success: false,
          message: 'Cotización no encontrada'
        };
      }
      
      console.log('✅ Cotización encontrada');
      
      return {
        success: true,
        cotizacion
      };
      
    } catch (error) {
      console.error('❌ Error en getCotizacionById:', error);
      throw error;
    }
  }
  
  // Actualizar estado de cotización
  async updateEstadoCotizacion(id, data) {
    try {
      console.log('📝 Actualizando estado de cotización:', id);
      
      const cotizacion = await Cotizacion.findByPk(id);
      
      if (!cotizacion) {
        return {
          success: false,
          message: 'Cotización no encontrada'
        };
      }
      
      await cotizacion.update(data);
      
      console.log('✅ Estado actualizado exitosamente');
      
      const message = data.estado === 'efectiva' ? 'Cotización aprobada exitosamente' :
                     data.estado === 'rechazada' ? 'Cotización rechazada' :
                     'Estado actualizado exitosamente';
      
      return {
        success: true,
        message,
        cotizacion
      };
      
    } catch (error) {
      console.error('❌ Error en updateEstadoCotizacion:', error);
      throw error;
    }
  }
  
  // Marcar PDF como generado
  async marcarPDFGenerado(cotizacionId, usuarioId) {
    try {
      console.log('📝 Marcando PDF como generado:', cotizacionId);
      
      const cotizacion = await Cotizacion.findOne({
        where: {
          cotizaciones_id: cotizacionId,
          usuarios_id: usuarioId
        }
      });
      
      if (!cotizacion) {
        return {
          success: false,
          message: 'Cotización no encontrada'
        };
      }
      
      await cotizacion.update({ pdf_generado: true });
      
      console.log('✅ PDF marcado como generado');
      
      return {
        success: true,
        message: 'PDF marcado como generado exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en marcarPDFGenerado:', error);
      throw error;
    }
  }
  
  // Obtener cotizaciones pendientes de aprobación
  async getCotizacionesPendientes() {
    try {
      console.log('📝 Obteniendo cotizaciones pendientes...');
      
      const cotizaciones = await Cotizacion.findAll({
        where: {
          estado: 'pendiente_aprobacion'
        },
        include: [
          {
            model: Cliente,
            as: 'cliente'
          },
          {
            model: Usuario,
            as: 'vendedor',
            attributes: ['usuarios_id', 'nombre_completo', 'correo']
          }
        ],
        order: [['fecha_creacion', 'ASC']]
      });
      
      console.log(`✅ ${cotizaciones.length} cotizaciones pendientes encontradas`);
      
      return {
        success: true,
        cotizaciones
      };
      
    } catch (error) {
      console.error('❌ Error en getCotizacionesPendientes:', error);
      throw error;
    }
  }
  
  // Obtener estadísticas
  async getEstadisticas(filters = {}) {
    try {
      console.log('📝 Calculando estadísticas...');
      
      const whereConditions = {};
      if (filters.usuarios_id) {
        whereConditions.usuarios_id = filters.usuarios_id;
      }
      
      const [
        totalCotizaciones,
        pendientes,
        aprobadas,
        rechazadas,
        pendientesAprobacion
      ] = await Promise.all([
        Cotizacion.count({ where: whereConditions }),
        Cotizacion.count({ where: { ...whereConditions, estado: 'pendiente' } }),
        Cotizacion.count({ where: { ...whereConditions, estado: 'efectiva' } }),
        Cotizacion.count({ where: { ...whereConditions, estado: 'rechazada' } }),
        Cotizacion.count({ where: { ...whereConditions, estado: 'pendiente_aprobacion' } })
      ]);
      
      const valorTotal = await Cotizacion.sum('total', {
        where: { ...whereConditions, estado: 'efectiva' }
      }) || 0;
      
      const estadisticas = {
        totalCotizaciones,
        pendientes,
        aprobadas,
        rechazadas,
        pendientesAprobacion,
        valorTotal,
        tasaAprobacion: totalCotizaciones > 0 ? 
          Math.round((aprobadas / totalCotizaciones) * 100) : 0
      };
      
      console.log('✅ Estadísticas calculadas');
      
      return {
        success: true,
        estadisticas
      };
      
    } catch (error) {
      console.error('❌ Error en getEstadisticas:', error);
      throw error;
    }
  }

  // Duplicar cotización
async duplicarCotizacion(cotizacionId, usuarioId) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('📝 Duplicando cotización:', cotizacionId);
    
    // 1. Obtener la cotización original con todos sus detalles
    const cotizacionOriginal = await Cotizacion.findOne({
      where: {
        cotizaciones_id: cotizacionId,
        usuarios_id: usuarioId
      },
      include: [
        {
          model: CotizacionDetalle,
          as: 'detalles'
        }
      ],
      transaction
    });
    
    if (!cotizacionOriginal) {
      await transaction.rollback();
      return {
        success: false,
        message: 'Cotización no encontrada o no tienes permisos para duplicarla'
      };
    }
    
    // 2. Crear nueva cotización basada en la original
    const nuevaCotizacionData = {
      clientes_id: cotizacionOriginal.clientes_id,
      usuarios_id: cotizacionOriginal.usuarios_id,
      total: cotizacionOriginal.total,
      comentario: `Duplicado de cotización #${cotizacionOriginal.cotizaciones_id} - ${cotizacionOriginal.comentario || ''}`,
      estado: 'pendiente', // Siempre empezar como pendiente
      pdf_generado: false, // Resetear PDF
      incluir_nombre_encargado: cotizacionOriginal.incluir_nombre_encargado,
      incluir_nombre_empresa: cotizacionOriginal.incluir_nombre_empresa,
      incluir_documento_fiscal: cotizacionOriginal.incluir_documento_fiscal,
      incluir_telefono_empresa: cotizacionOriginal.incluir_telefono_empresa,
      incluir_correo_empresa: cotizacionOriginal.incluir_correo_empresa,
      tipo_precio_pdf: cotizacionOriginal.tipo_precio_pdf
    };
    
    const nuevaCotizacion = await Cotizacion.create(nuevaCotizacionData, { transaction });
    
    // 3. Duplicar los detalles
    if (cotizacionOriginal.detalles && cotizacionOriginal.detalles.length > 0) {
      const nuevosDetalles = cotizacionOriginal.detalles.map(detalle => ({
        cotizaciones_id: nuevaCotizacion.cotizaciones_id,
        servicios_id: detalle.servicios_id,
        cantidad_equipos: detalle.cantidad_equipos,
        cantidad_servicios: detalle.cantidad_servicios,
        cantidad_gb: detalle.cantidad_gb,
        cantidad_anos: detalle.cantidad_anos,
        precio_usado: detalle.precio_usado,
        subtotal: detalle.subtotal
      }));
      
      await CotizacionDetalle.bulkCreate(nuevosDetalles, { transaction });
    }
    
    await transaction.commit();
    
    console.log('✅ Cotización duplicada exitosamente');
    
    return {
      success: true,
      message: 'Cotización duplicada exitosamente',
      cotizacion: nuevaCotizacion
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en duplicarCotizacion:', error);
    throw error;
  }
}
}


module.exports = new CotizacionService();