// services/cotizacionService.js - COMPLETO CORREGIDO PARA MESES
const { Cotizacion, CotizacionDetalle, Cliente, Servicio, Usuario, Categoria, UnidadMedida } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class CotizacionService {

async createCotizacion(data) {
 const transaction = await sequelize.transaction();
 
 try {
   // CAMBIO: usar mesesContrato en lugar de añosContrato
   const { cliente, servicios, mesesContrato, precioTotal, tipoPrecio, configuracionPDF, comentario, usuarios_id } = data;
   
   // 1. Crear o actualizar cliente (MANTENER IGUAL)
   let clienteRecord;
   if (cliente.clientes_id) {
     clienteRecord = await Cliente.findOne({
       where: {
         clientes_id: cliente.clientes_id,
         usuarios_id: usuarios_id
       },
       transaction
     });
     
     if (!clienteRecord) {
       await transaction.rollback();
       return {
         success: false,
         message: 'Cliente no encontrado o no tienes permisos para usarlo'
       };
     }
     
     if (cliente.nombreEncargado || cliente.nombreEmpresa) {
       await clienteRecord.update({
         nombre_encargado: cliente.nombreEncargado || clienteRecord.nombre_encargado,
         telefono_personal: cliente.telefonoPersonal || clienteRecord.telefono_personal,
         telefono_empresa: cliente.telefonoEmpresa || clienteRecord.telefono_empresa,
         nombre_empresa: cliente.nombreEmpresa || clienteRecord.nombre_empresa,
         documento_fiscal: cliente.documentofiscal || clienteRecord.documento_fiscal,
         correo_personal: cliente.correoPersonal || clienteRecord.correo_personal,
         correo_empresa: cliente.correoEmpresa || clienteRecord.correo_empresa
       }, { transaction });
     }
   } else {
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
   }
   
   // 2. Procesar servicios por categorías individuales - SIN CAMBIOS HASTA EL CÁLCULO
   const detallesParaCrear = [];
   let requiereAprobacion = false;
   
   for (let i = 0; i < servicios.length; i++) {
     const servicioItem = servicios[i];
     
     const servicio = await Servicio.findByPk(
       servicioItem.servicio.servicios_id || servicioItem.servicio.id,
       {
         include: [
           {
             model: Categoria,
             as: 'categoria',
             include: [
               {
                 model: UnidadMedida,
                 as: 'unidad_medida'
               }
             ]
           }
         ],
         transaction
       }
     );
     
     if (!servicio) {
       await transaction.rollback();
       return {
         success: false,
         message: `Servicio con ID ${servicioItem.servicio.servicios_id || servicioItem.servicio.id} no encontrado`
       };
     }
     
     // Verificar si el precio está por debajo del mínimo
     if (servicioItem.precioVentaFinal < servicio.precio_minimo) {
       requiereAprobacion = true;
     }
     
     if (servicioItem.categoriasDetalle && servicioItem.categoriasDetalle.length > 0) {
       for (let j = 0; j < servicioItem.categoriasDetalle.length; j++) {
         const categoriaDetalle = servicioItem.categoriasDetalle[j];
         
         if (categoriaDetalle.cantidad > 0) {
           const categoriaId = categoriaDetalle.id || categoriaDetalle.categorias_id || categoriaDetalle.categoria_id;

           
           const categoria = await Categoria.findByPk(categoriaId, {
             include: [
               {
                 model: UnidadMedida,
                 as: 'unidad_medida'
               }
             ],
             transaction
           });
           
           if (!categoria) {
             continue; // Saltar esta categoría
           }
           
           // CAMBIO: calcular subtotal usando meses en lugar de años
           const subtotal = categoriaDetalle.cantidad * servicioItem.precioVentaFinal * mesesContrato;
           
           // En la sección de categoriasDetalle, después de validar la categoría:
const detalleParaCrear = {
  servicios_id: servicio.servicios_id,
  categorias_id: categoria.categorias_id, // ← Asegúrate de usar categoria.categorias_id
  unidades_medida_id: categoria.unidades_medida_id,
  cantidad: categoriaDetalle.cantidad,
  cantidad_anos: mesesContrato,
  precio_usado: servicioItem.precioVentaFinal,
  subtotal: subtotal,
  cantidad_equipos: 0,
  cantidad_servicios: categoriaDetalle.cantidad,
  cantidad_gb: categoria.unidad_medida.tipo === 'capacidad' ? categoriaDetalle.cantidad : 0
};
           
           detallesParaCrear.push(detalleParaCrear);
         }
       }
     } else {
       // FALLBACK MEJORADO - SIN CAMBIOS HASTA EL CÁLCULO FINAL
       let cantidadPrincipal = 0;
       let cantidadSecundaria = 0;
       let cantidadGB = 0;
       let categoriasId = servicio.categorias_id;
       let unidadesMedidaId = servicio.categoria?.unidades_medida_id;
       
       // Verificar que tengamos categorias_id válido
       if (!categoriasId) {
         const categoriaDefault = await Categoria.findOne({ 
           include: [
             {
               model: UnidadMedida,
               as: 'unidad_medida'
             }
           ],
           transaction 
         });
         
         if (categoriaDefault) {
           categoriasId = categoriaDefault.categorias_id;
           unidadesMedidaId = categoriaDefault.unidades_medida_id;
         } else {
           await transaction.rollback();
           return {
             success: false,
             message: 'Error: No hay categorías configuradas en el sistema. Por favor contacte al administrador.'
           };
         }
       }
       
       // Verificar que tengamos unidades_medida_id válido
       if (!unidadesMedidaId) {
         const unidadPorDefecto = await UnidadMedida.findOne({
           where: { tipo: 'cantidad' },
           transaction
         });
         
         if (unidadPorDefecto) {
           unidadesMedidaId = unidadPorDefecto.unidades_medida_id;
         } else {
           const primeraUnidad = await UnidadMedida.findOne({ transaction });
           if (primeraUnidad) {
             unidadesMedidaId = primeraUnidad.unidades_medida_id;
           } else {
             await transaction.rollback();
             return {
               success: false,
               message: 'Error: No hay unidades de medida configuradas en el sistema. Por favor contacte al administrador.'
             };
           }
         }
       }
       
       // Procesar cantidades según el tipo de unidad con inferencia - SIN CAMBIOS
       if (servicio.categoria && servicio.categoria.unidad_medida) {
         const tipoUnidad = servicio.categoria.unidad_medida.tipo;
         
         switch (tipoUnidad) {
           case 'capacidad':
             cantidadPrincipal = servicioItem.cantidadGB || servicioItem.cantidadGb || servicioItem.cantidadServidores || 0;
             cantidadGB = cantidadPrincipal;
             
             if (cantidadPrincipal === 0 && servicioItem.precioVentaFinal > 0) {
               const precioUnitario = servicio.precio_recomendado || servicio.precio_minimo || 1;
               cantidadPrincipal = Math.max(Math.round((servicioItem.precioVentaFinal * mesesContrato) / precioUnitario), 1);
               cantidadGB = cantidadPrincipal;
             }
             break;
             
           case 'usuarios':
             cantidadPrincipal = servicioItem.cantidadUsuarios || servicioItem.cantidadServidores || 0;
             
             if (cantidadPrincipal === 0 && servicioItem.precioVentaFinal > 0) {
               const precioUnitario = servicio.precio_recomendado || servicio.precio_minimo || 1;
               cantidadPrincipal = Math.max(Math.round((servicioItem.precioVentaFinal * mesesContrato) / precioUnitario), 1);
             }
             break;
             
           case 'sesiones':
             cantidadPrincipal = servicioItem.cantidadSesiones || servicioItem.cantidadServidores || 0;
             
             if (cantidadPrincipal === 0 && servicioItem.precioVentaFinal > 0) {
               const precioUnitario = servicio.precio_recomendado || servicio.precio_minimo || 1;
               cantidadPrincipal = Math.max(Math.round((servicioItem.precioVentaFinal * mesesContrato) / precioUnitario), 1);
             }
             break;
             
           case 'tiempo':
             cantidadPrincipal = servicioItem.cantidadTiempo || servicioItem.cantidadServidores || 0;
             
             if (cantidadPrincipal === 0 && servicioItem.precioVentaFinal > 0) {
               const precioUnitario = servicio.precio_recomendado || servicio.precio_minimo || 1;
               cantidadPrincipal = Math.max(Math.round((servicioItem.precioVentaFinal * mesesContrato) / precioUnitario), 1);
             }
             break;
             
           case 'cantidad':
           default:
             cantidadPrincipal = servicioItem.cantidadServidores || 0;
             cantidadSecundaria = servicioItem.cantidadEquipos || 0;
             
             if (cantidadPrincipal === 0 && servicioItem.precioVentaFinal > 0) {
               const precioUnitario = servicio.precio_recomendado || servicio.precio_minimo || 1;
               cantidadPrincipal = Math.max(Math.round((servicioItem.precioVentaFinal * mesesContrato) / precioUnitario), 1);
             }
             break;
         }
       } else {
         cantidadPrincipal = servicioItem.cantidadServidores || 0;
         cantidadSecundaria = servicioItem.cantidadEquipos || 0;
         
         // Inferencia para servicios sin tipo específico
         if (cantidadPrincipal === 0 && servicioItem.precioVentaFinal > 0) {
           const precioUnitario = servicio.precio_recomendado || servicio.precio_minimo || 1;
           cantidadPrincipal = Math.max(Math.round((servicioItem.precioVentaFinal * mesesContrato) / precioUnitario), 1);
         }
       }
       
       // Calcular total y validar que no sea 0
       const totalUnidades = cantidadPrincipal + cantidadSecundaria;
       const cantidadFinal = Math.max(totalUnidades, 1); // Al menos 1 unidad
       
       // CAMBIO: calcular subtotal usando meses en lugar de años
       const subtotal = servicioItem.precioVentaFinal * cantidadFinal * mesesContrato;
       
       const detalleFallback = {
         servicios_id: servicio.servicios_id,
         categorias_id: categoriasId,
         unidades_medida_id: unidadesMedidaId,
         cantidad: cantidadFinal,
         cantidad_anos: mesesContrato, // NOTA: Guardamos meses en cantidad_anos (sin cambiar BD)
         precio_usado: servicioItem.precioVentaFinal,
         subtotal: subtotal,
         cantidad_equipos: cantidadSecundaria,
         cantidad_servicios: Math.max(cantidadPrincipal, 1),
         cantidad_gb: cantidadGB
       };
       
       detallesParaCrear.push(detalleFallback);
     }
   }
   
   // 3. Determinar estado de la cotización - SIN CAMBIOS
   const estado = requiereAprobacion ? 'pendiente_aprobacion' : 'pendiente';
   
   // 4. Crear cotización - SIN CAMBIOS
   const nuevaCotizacion = await Cotizacion.create({
     clientes_id: clienteRecord.clientes_id,
     usuarios_id: usuarios_id,
     total: precioTotal,
     comentario: comentario || null,
     estado: estado,
     pdf_generado: requiereAprobacion ? true : false,
     incluir_nombre_encargado: configuracionPDF?.incluirNombreEncargado || false,
     incluir_nombre_empresa: configuracionPDF?.incluirNombreEmpresa || false,
     incluir_documento_fiscal: configuracionPDF?.incluirDocumentoFiscal || false,
     incluir_telefono_empresa: configuracionPDF?.incluirTelefonoEmpresa || false,
     incluir_correo_empresa: configuracionPDF?.incluirCorreoEmpresa || false,
     tipo_precio_pdf: tipoPrecio || 'venta'
   }, { transaction });
   
   // 5. Crear detalles - una fila por categoría - SIN CAMBIOS
   const detallesConCotizacionId = detallesParaCrear.map(detalle => ({
     ...detalle,
     cotizaciones_id: nuevaCotizacion.cotizaciones_id
   }));
   
   const detallesCreados = await CotizacionDetalle.bulkCreate(
     detallesConCotizacionId,
     { transaction }
   );
   
   await transaction.commit();
   
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

 // RESTO DE MÉTODOS SIN CAMBIOS...
 async getCotizaciones(filters) {
   try {
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

 // RESTO DE MÉTODOS SIN CAMBIOS...
 async getCotizacionById(id) {
   try {
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
                   as: 'categoria',
                   include: [
                     {
                       model: UnidadMedida,
                       as: 'unidad_medida'
                     }
                   ]
                 }
               ]
             },
             {
               model: UnidadMedida,
               as: 'unidad_medida'
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
     
     return {
       success: true,
       cotizacion
     };
     
   } catch (error) {
     console.error('❌ Error en getCotizacionById:', error);
     throw error;
   }
 }

 // RESTO DE MÉTODOS SIN CAMBIOS...
 async updateEstadoCotizacion(id, data) {
   try {
     const cotizacion = await Cotizacion.findByPk(id);
     
     if (!cotizacion) {
       return {
         success: false,
         message: 'Cotización no encontrada'
       };
     }
     
     await cotizacion.update(data);
     
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

 async marcarPDFGenerado(cotizacionId, usuarioId) {
   try {
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
     
     return {
       success: true,
       message: 'PDF marcado como generado exitosamente'
     };
     
   } catch (error) {
     console.error('❌ Error en marcarPDFGenerado:', error);
     throw error;
   }
 }

 async getCotizacionesPendientes() {
   try {
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
     
     return {
       success: true,
       cotizaciones
     };
     
   } catch (error) {
     console.error('❌ Error en getCotizacionesPendientes:', error);
     throw error;
   }
 }

 async getEstadisticas(filters = {}) {
   try {
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
    
    return {
      success: true,
      estadisticas
    };
    
  } catch (error) {
    console.error('❌ Error en getEstadisticas:', error);
    throw error;
  }
}

async duplicarCotizacion(cotizacionId, usuarioId) {
  const transaction = await sequelize.transaction();
  
  try {
    const cotizacionOriginal = await Cotizacion.findOne({
      where: {
        cotizaciones_id: cotizacionId,
        usuarios_id: usuarioId
      },
      include: [
        {
          model: CotizacionDetalle,
          as: 'detalles',
          include: [
            {
              model: Servicio,
              as: 'servicio'
            },
            {
              model: UnidadMedida,
              as: 'unidad_medida'
            }
          ]
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
    
    // NOTA: Los campos siguen igual, cantidad_anos guarda meses
    const nuevaCotizacionData = {
      clientes_id: cotizacionOriginal.clientes_id,
      usuarios_id: cotizacionOriginal.usuarios_id,
      total: cotizacionOriginal.total,
      comentario: `Duplicado de cotización #${cotizacionOriginal.cotizaciones_id} - ${cotizacionOriginal.comentario || ''}`,
      estado: 'pendiente',
      pdf_generado: false,
      incluir_nombre_encargado: cotizacionOriginal.incluir_nombre_encargado,
      incluir_nombre_empresa: cotizacionOriginal.incluir_nombre_empresa,
      incluir_documento_fiscal: cotizacionOriginal.incluir_documento_fiscal,
      incluir_telefono_empresa: cotizacionOriginal.incluir_telefono_empresa,
      incluir_correo_empresa: cotizacionOriginal.incluir_correo_empresa,
      tipo_precio_pdf: cotizacionOriginal.tipo_precio_pdf
    };
    
    const nuevaCotizacion = await Cotizacion.create(nuevaCotizacionData, { transaction });
    
    if (cotizacionOriginal.detalles && cotizacionOriginal.detalles.length > 0) {
      const nuevosDetalles = cotizacionOriginal.detalles.map(detalle => ({
        cotizaciones_id: nuevaCotizacion.cotizaciones_id,
        servicios_id: detalle.servicios_id,
        categorias_id: detalle.categorias_id,
        unidades_medida_id: detalle.unidades_medida_id,
        cantidad: detalle.cantidad,
        cantidad_equipos: detalle.cantidad_equipos,
        cantidad_servicios: detalle.cantidad_servicios,
        cantidad_gb: detalle.cantidad_gb,
        cantidad_anos: detalle.cantidad_anos, // NOTA: Esto sigue siendo meses
        precio_usado: detalle.precio_usado,
        subtotal: detalle.subtotal
      }));
      
      await CotizacionDetalle.bulkCreate(nuevosDetalles, { transaction });
    }
    
    await transaction.commit();
    
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