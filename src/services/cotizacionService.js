// services/cotizacionService.js - COMPLETO CORREGIDO
const { Cotizacion, CotizacionDetalle, Cliente, Servicio, Usuario, Categoria, UnidadMedida } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class CotizacionService {

async createCotizacion(data) {
 const transaction = await sequelize.transaction();
 
 try {
   console.log('📝 Iniciando creación de cotización...');
   console.log('🔥 DEBUG - DATA RECIBIDA COMPLETA:', JSON.stringify(data, null, 2));
   
   const { cliente, servicios, añosContrato, precioTotal, tipoPrecio, configuracionPDF, comentario, usuarios_id } = data;
   
   console.log('🏢 Datos del cliente recibidos:', cliente);
   console.log('🔍 Cliente ID recibido:', cliente.clientes_id);
   console.log('📋 SERVICIOS RECIBIDOS:', JSON.stringify(servicios, null, 2));
   console.log('📊 TOTAL SERVICIOS:', servicios.length);
   
   // 1. Crear o actualizar cliente (MANTENER IGUAL)
   let clienteRecord;
   if (cliente.clientes_id) {
     console.log('✅ Buscando cliente existente con ID:', cliente.clientes_id);
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
   
   // 2. Procesar servicios por categorías individuales
   console.log('🔍 Procesando servicios con categorías individuales...');
   console.log('🔥 DEBUG - INICIANDO LOOP DE SERVICIOS, TOTAL:', servicios.length);
   
   const detallesParaCrear = [];
   let requiereAprobacion = false;
   
   for (let i = 0; i < servicios.length; i++) {
     const servicioItem = servicios[i];
     console.log(`🔥 DEBUG - SERVICIO ${i + 1}/${servicios.length}:`, JSON.stringify(servicioItem, null, 2));
     console.log(`🔥 DEBUG - servicioItem.categoriasDetalle:`, servicioItem.categoriasDetalle);
     console.log(`🔥 DEBUG - categoriasDetalle existe?:`, !!(servicioItem.categoriasDetalle));
     console.log(`🔥 DEBUG - categoriasDetalle es array?:`, Array.isArray(servicioItem.categoriasDetalle));
     console.log(`🔥 DEBUG - categoriasDetalle length:`, servicioItem.categoriasDetalle?.length);
     
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
       console.log('❌ Servicio no encontrado:', servicioItem.servicio.servicios_id || servicioItem.servicio.id);
       await transaction.rollback();
       return {
         success: false,
         message: `Servicio con ID ${servicioItem.servicio.servicios_id || servicioItem.servicio.id} no encontrado`
       };
     }
     
     console.log(`🔥 DEBUG - SERVICIO ENCONTRADO:`, servicio.nombre);
     
     // Verificar si el precio está por debajo del mínimo
     if (servicioItem.precioVentaFinal < servicio.precio_minimo) {
       console.log('⚠️ Precio por debajo del mínimo detectado para:', servicio.nombre);
       requiereAprobacion = true;
     }
     
     // ✅ CONDICIÓN CRÍTICA: Procesar cada categoría individualmente
     console.log(`🔥 DEBUG - EVALUANDO CONDICIÓN DE categoriasDetalle:`);
     console.log(`🔥 DEBUG - servicioItem.categoriasDetalle:`, servicioItem.categoriasDetalle);
     console.log(`🔥 DEBUG - servicioItem.categoriasDetalle && servicioItem.categoriasDetalle.length > 0:`, 
       !!(servicioItem.categoriasDetalle && servicioItem.categoriasDetalle.length > 0));
     
     if (servicioItem.categoriasDetalle && servicioItem.categoriasDetalle.length > 0) {
       console.log(`✅ ✅ ✅ ENTRANDO EN PROCESAMIENTO DE CATEGORÍAS DETALLADAS`);
       console.log(`📋 Procesando ${servicioItem.categoriasDetalle.length} categorías para ${servicio.nombre}`);
       
       for (let j = 0; j < servicioItem.categoriasDetalle.length; j++) {
         const categoriaDetalle = servicioItem.categoriasDetalle[j];
         console.log(`🔥 DEBUG - CATEGORIA ${j + 1}:`, JSON.stringify(categoriaDetalle, null, 2));
         console.log(`🔥 DEBUG - categoriaDetalle.cantidad:`, categoriaDetalle.cantidad);
         console.log(`🔥 DEBUG - cantidad > 0?:`, categoriaDetalle.cantidad > 0);
         
         if (categoriaDetalle.cantidad > 0) {
           console.log(`✅ PROCESANDO CATEGORIA CON CANTIDAD > 0`);
           
           // ✅ CORREGIDO: Buscar categoría con ID correcto
           const categoriaId = categoriaDetalle.id || categoriaDetalle.categorias_id;
           console.log(`🔥 DEBUG - categoriaId:`, categoriaId);
           
           const categoria = await Categoria.findByPk(categoriaId, {
             include: [
               {
                 model: UnidadMedida,
                 as: 'unidad_medida'
               }
             ],
             transaction
           });
           
           console.log(`🔥 DEBUG - CATEGORIA ENCONTRADA:`, categoria?.nombre || 'NO ENCONTRADA');
           
           if (!categoria) {
             console.log('⚠️ Categoría no encontrada:', categoriaId);
             continue; // Saltar esta categoría
           }
           
           const subtotal = categoriaDetalle.cantidad * servicioItem.precioVentaFinal * añosContrato;
           
           console.log(`✅ Categoría ${categoria.nombre}: ${categoriaDetalle.cantidad} ${categoria.unidad_medida?.abreviacion || 'unidades'} = $${subtotal}`);
           
           const detalleParaCrear = {
             servicios_id: servicio.servicios_id,
             categorias_id: categoriaId,
             unidades_medida_id: categoria.unidades_medida_id,
             cantidad: categoriaDetalle.cantidad,
             cantidad_anos: añosContrato,
             precio_usado: servicioItem.precioVentaFinal,
             subtotal: subtotal,
             cantidad_equipos: 0,
             cantidad_servicios: categoriaDetalle.cantidad,
             cantidad_gb: categoria.unidad_medida.tipo === 'capacidad' ? categoriaDetalle.cantidad : 0
           };
           
           console.log(`🔥 DEBUG - DETALLE CREADO PARA CATEGORIA:`, JSON.stringify(detalleParaCrear, null, 2));
           
           // ✅ CREAR UN DETALLE POR CADA CATEGORÍA
           detallesParaCrear.push(detalleParaCrear);
           
           console.log(`✅ DETALLE AGREGADO AL ARRAY. TOTAL DETALLES:`, detallesParaCrear.length);
         } else {
           console.log(`⚠️ CATEGORIA CON CANTIDAD 0 O NEGATIVA, SALTANDO`);
         }
       }
     } else {
       console.log(`❌ ❌ ❌ NO HAY categoriasDetalle O ESTÁ VACÍO - USANDO FALLBACK`);
       // ✅ FALLBACK MEJORADO: Si no hay categoriasDetalle, usar método anterior con inferencia
       console.log(`⚠️ Servicio ${servicio.nombre} sin categorías detalladas, usando fallback mejorado`);
       
       let cantidadPrincipal = 0;
       let cantidadSecundaria = 0;
       let cantidadGB = 0;
       let categoriasId = servicio.categorias_id;
       let unidadesMedidaId = servicio.categoria?.unidades_medida_id;
       
       console.log(`🔥 DEBUG FALLBACK - categoriasId inicial:`, categoriasId);
       console.log(`🔥 DEBUG FALLBACK - unidadesMedidaId inicial:`, unidadesMedidaId);
       
       // ✅ VERIFICACIÓN CRÍTICA: Asegurar que tengamos categorias_id válido
       if (!categoriasId) {
         console.log('⚠️ Servicio sin categoría asignada, buscando categoría por defecto...');
         
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
           console.log(`✅ Usando categoría por defecto: ${categoriaDefault.nombre} (ID: ${categoriasId})`);
         } else {
           console.log('❌ No hay categorías disponibles en el sistema');
           await transaction.rollback();
           return {
             success: false,
             message: 'Error: No hay categorías configuradas en el sistema. Por favor contacte al administrador.'
           };
         }
       }
       
       // ✅ VERIFICACIÓN CRÍTICA: Asegurar que tengamos unidades_medida_id válido
       if (!unidadesMedidaId) {
         console.log('⚠️ Sin unidad de medida, buscando unidad por defecto...');
         
         const unidadPorDefecto = await UnidadMedida.findOne({
           where: { tipo: 'cantidad' },
           transaction
         });
         
         if (unidadPorDefecto) {
           unidadesMedidaId = unidadPorDefecto.unidades_medida_id;
           console.log(`✅ Usando unidad por defecto: ${unidadPorDefecto.nombre} (ID: ${unidadesMedidaId})`);
         } else {
           const primeraUnidad = await UnidadMedida.findOne({ transaction });
           if (primeraUnidad) {
             unidadesMedidaId = primeraUnidad.unidades_medida_id;
             console.log(`✅ Usando primera unidad disponible: ${primeraUnidad.nombre} (ID: ${unidadesMedidaId})`);
           } else {
             console.log('❌ No hay unidades de medida disponibles en el sistema');
             await transaction.rollback();
             return {
               success: false,
               message: 'Error: No hay unidades de medida configuradas en el sistema. Por favor contacte al administrador.'
             };
           }
         }
       }
       
       console.log(`🔥 DEBUG FALLBACK - cantidades del servicioItem:`);
       console.log(`🔥 DEBUG FALLBACK - cantidadServidores:`, servicioItem.cantidadServidores);
       console.log(`🔥 DEBUG FALLBACK - cantidadEquipos:`, servicioItem.cantidadEquipos);
       console.log(`🔥 DEBUG FALLBACK - cantidadGB:`, servicioItem.cantidadGB);
       console.log(`🔥 DEBUG FALLBACK - cantidadGb:`, servicioItem.cantidadGb);
       
       // ✅ PROCESAR CANTIDADES SEGÚN EL TIPO DE UNIDAD CON INFERENCIA
       if (servicio.categoria && servicio.categoria.unidad_medida) {
         const tipoUnidad = servicio.categoria.unidad_medida.tipo;
         console.log(`📏 Procesando según tipo de unidad: ${tipoUnidad}`);
         
         switch (tipoUnidad) {
           case 'capacidad':
             cantidadPrincipal = servicioItem.cantidadGB || servicioItem.cantidadGb || servicioItem.cantidadServidores || 0;
             cantidadGB = cantidadPrincipal;
             
             if (cantidadPrincipal === 0 && servicioItem.precioVentaFinal > 0) {
               const precioUnitario = servicio.precio_recomendado || servicio.precio_minimo || 1;
               cantidadPrincipal = Math.max(Math.round((servicioItem.precioVentaFinal * añosContrato) / precioUnitario), 1);
               cantidadGB = cantidadPrincipal;
               console.log(`💡 Capacidad inferida del precio: ${cantidadPrincipal} GB`);
             } else {
               console.log(`💾 Capacidad: ${cantidadPrincipal} GB`);
             }
             break;
             
           case 'usuarios':
             cantidadPrincipal = servicioItem.cantidadUsuarios || servicioItem.cantidadServidores || 0;
             
             if (cantidadPrincipal === 0 && servicioItem.precioVentaFinal > 0) {
               const precioUnitario = servicio.precio_recomendado || servicio.precio_minimo || 1;
               cantidadPrincipal = Math.max(Math.round((servicioItem.precioVentaFinal * añosContrato) / precioUnitario), 1);
               console.log(`💡 Usuarios inferidos del precio: ${cantidadPrincipal}`);
             } else {
               console.log(`👥 Usuarios: ${cantidadPrincipal}`);
             }
             break;
             
           case 'sesiones':
             cantidadPrincipal = servicioItem.cantidadSesiones || servicioItem.cantidadServidores || 0;
             
             if (cantidadPrincipal === 0 && servicioItem.precioVentaFinal > 0) {
               const precioUnitario = servicio.precio_recomendado || servicio.precio_minimo || 1;
               cantidadPrincipal = Math.max(Math.round((servicioItem.precioVentaFinal * añosContrato) / precioUnitario), 1);
               console.log(`💡 Sesiones inferidas del precio: ${cantidadPrincipal}`);
             } else {
               console.log(`🔗 Sesiones: ${cantidadPrincipal}`);
             }
             break;
             
           case 'tiempo':
             cantidadPrincipal = servicioItem.cantidadTiempo || servicioItem.cantidadServidores || 0;
             
             if (cantidadPrincipal === 0 && servicioItem.precioVentaFinal > 0) {
               const precioUnitario = servicio.precio_recomendado || servicio.precio_minimo || 1;
               cantidadPrincipal = Math.max(Math.round((servicioItem.precioVentaFinal * añosContrato) / precioUnitario), 1);
               console.log(`💡 Tiempo inferido del precio: ${cantidadPrincipal}`);
             } else {
               console.log(`⏰ Tiempo: ${cantidadPrincipal}`);
             }
             break;
             
           case 'cantidad':
           default:
             cantidadPrincipal = servicioItem.cantidadServidores || 0;
             cantidadSecundaria = servicioItem.cantidadEquipos || 0;
             
             if (cantidadPrincipal === 0 && servicioItem.precioVentaFinal > 0) {
               const precioUnitario = servicio.precio_recomendado || servicio.precio_minimo || 1;
               cantidadPrincipal = Math.max(Math.round((servicioItem.precioVentaFinal * añosContrato) / precioUnitario), 1);
               console.log(`💡 Cantidad inferida del precio: ${cantidadPrincipal}`);
             } else {
               console.log(`⚙️ Cantidad: ${cantidadPrincipal} principal, ${cantidadSecundaria} equipos`);
             }
             break;
         }
       } else {
         cantidadPrincipal = servicioItem.cantidadServidores || 0;
         cantidadSecundaria = servicioItem.cantidadEquipos || 0;
         
         // ✅ INFERENCIA PARA SERVICIOS SIN TIPO ESPECÍFICO
         if (cantidadPrincipal === 0 && servicioItem.precioVentaFinal > 0) {
           const precioUnitario = servicio.precio_recomendado || servicio.precio_minimo || 1;
           cantidadPrincipal = Math.max(Math.round((servicioItem.precioVentaFinal * añosContrato) / precioUnitario), 1);
           console.log(`💡 Cantidad inferida del precio: ${cantidadPrincipal}`);
         } else {
           console.log(`🔧 Sin unidad específica: ${cantidadPrincipal} principal, ${cantidadSecundaria} equipos`);
         }
       }
       
       // ✅ CALCULAR TOTAL Y VALIDAR QUE NO SEA 0
       const totalUnidades = cantidadPrincipal + cantidadSecundaria;
       const cantidadFinal = Math.max(totalUnidades, 1); // Al menos 1 unidad
       
       if (totalUnidades === 0) {
         console.log('⚠️ Total de unidades es 0, asignando 1 por defecto');
       }
       
       const subtotal = servicioItem.precioVentaFinal * cantidadFinal * añosContrato;
       
       console.log(`📊 Servicio: ${servicio.nombre}`);
       console.log(`🆔 Categoría ID: ${categoriasId}`);
       console.log(`📏 Unidad ID: ${unidadesMedidaId}`);
       console.log(`🔢 Cantidad final: ${cantidadFinal}`);
       console.log(`💰 Subtotal: ${subtotal}`);
       
       const detalleFallback = {
         servicios_id: servicio.servicios_id,
         categorias_id: categoriasId,
         unidades_medida_id: unidadesMedidaId,
         cantidad: cantidadFinal,
         cantidad_anos: añosContrato,
         precio_usado: servicioItem.precioVentaFinal,
         subtotal: subtotal,
         cantidad_equipos: cantidadSecundaria,
         cantidad_servicios: Math.max(cantidadPrincipal, 1),
         cantidad_gb: cantidadGB
       };
       
       console.log(`🔥 DEBUG FALLBACK - DETALLE CREADO:`, JSON.stringify(detalleFallback, null, 2));
       
       // ✅ CREAR UN DETALLE CON TODOS LOS CAMPOS REQUERIDOS
       detallesParaCrear.push(detalleFallback);
     }
     
     console.log(`🔥 DEBUG - FIN DEL SERVICIO ${i + 1}. DETALLES TOTALES:`, detallesParaCrear.length);
   }
   
   console.log(`✅ ${detallesParaCrear.length} detalles preparados para crear`);
   console.log('🔥 DEBUG - TODOS LOS DETALLES ANTES DE CREAR:', JSON.stringify(detallesParaCrear, null, 2));
   
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
     pdf_generado: requiereAprobacion ? true : false,
     incluir_nombre_encargado: configuracionPDF?.incluirNombreEncargado || false,
     incluir_nombre_empresa: configuracionPDF?.incluirNombreEmpresa || false,
     incluir_documento_fiscal: configuracionPDF?.incluirDocumentoFiscal || false,
     incluir_telefono_empresa: configuracionPDF?.incluirTelefonoEmpresa || false,
     incluir_correo_empresa: configuracionPDF?.incluirCorreoEmpresa || false,
     tipo_precio_pdf: tipoPrecio || 'venta'
   }, { transaction });

   console.log(requiereAprobacion ? 
     '📋 Cotización pendiente_aprobacion: PDF marcado como generado automáticamente' :
     '💾 Cotización normal: PDF se generará cuando el usuario lo solicite'
   );
   
   // 5. CREAR DETALLES - UNA FILA POR CATEGORÍA
   console.log('📝 Creando detalles de la cotización...');
   console.log('🔥 DEBUG - detallesParaCrear ANTES de bulkCreate:', JSON.stringify(detallesParaCrear, null, 2));
   
   const detallesConCotizacionId = detallesParaCrear.map(detalle => ({
     ...detalle,
     cotizaciones_id: nuevaCotizacion.cotizaciones_id
   }));
   
   console.log('🔥 DEBUG - detallesConCotizacionId:', JSON.stringify(detallesConCotizacionId, null, 2));
   
   const detallesCreados = await CotizacionDetalle.bulkCreate(
     detallesConCotizacionId,
     { transaction }
   );
   
   console.log(`✅ ${detallesCreados.length} detalles de la cotización creados`);
   console.log('🔥 DEBUG - detallesCreados:', JSON.stringify(detallesCreados, null, 2));
   
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

 // RESTO DE MÉTODOS SIN CAMBIOS...
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
     
     console.log('✅ Cotización encontrada con detalles por categoría');
     
     return {
       success: true,
       cotizacion
     };
     
   } catch (error) {
     console.error('❌ Error en getCotizacionById:', error);
     throw error;
   }
 }

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

 async duplicarCotizacion(cotizacionId, usuarioId) {
   const transaction = await sequelize.transaction();
   
   try {
     console.log('📝 Duplicando cotización:', cotizacionId);
     
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
        cantidad_anos: detalle.cantidad_anos,
        precio_usado: detalle.precio_usado,
        subtotal: detalle.subtotal
      }));
      
      await CotizacionDetalle.bulkCreate(nuevosDetalles, { transaction });
      console.log(`✅ ${nuevosDetalles.length} detalles duplicados con estructura por categorías`);
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