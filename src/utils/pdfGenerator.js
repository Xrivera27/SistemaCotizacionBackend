// utils/pdfGenerator.js - COMPLETO ACTUALIZADO CON MARCA DE COPIA
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
 
 constructor() {
   this.doc = null;
   this.pageMargin = 40;
   this.currentY = this.pageMargin;
 }
 
 // ✅ ACTUALIZADO: Agregar parámetro tipo para manejar COPIA
 async generarCotizacionPDF(cotizacion, tipo = 'original', outputPath = null) {
   try {
     console.log('📄 Generando PDF de cotización...');
     
     this.doc = new PDFDocument({
       size: 'A4',
       margin: this.pageMargin,
       info: {
         Title: `Cotización ${cotizacion.cotizaciones_id}`,
         Author: 'Sistema de Cotizaciones',
         Subject: `Cotización para ${cotizacion.cliente.nombre_empresa}`,
         Keywords: 'cotización, servicios, cloud'
       }
     });
     
     // Si se proporciona una ruta, guardar el archivo
     if (outputPath) {
       this.doc.pipe(fs.createWriteStream(outputPath));
     }
     
     // Configurar el buffer para devolver los datos
     const buffers = [];
     this.doc.on('data', buffers.push.bind(buffers));
     
     await this._construirPDF(cotizacion, tipo); // ✅ PASAR TIPO
     
     this.doc.end();
     
     // Esperar a que se complete la generación
     return new Promise((resolve, reject) => {
       this.doc.on('end', () => {
         const pdfData = Buffer.concat(buffers);
         console.log('✅ PDF generado exitosamente');
         resolve(pdfData);
       });
       this.doc.on('error', reject);
     });
     
   } catch (error) {
     console.error('❌ Error generando PDF:', error);
     throw error;
   }
 }
 
 // ✅ ACTUALIZADO: Recibir parámetro tipo
 async _construirPDF(cotizacion, tipo = 'original') {
   // Configurar colores
   const primaryColor = '#2c3e50';
   const secondaryColor = '#3498db';
   const accentColor = '#27ae60';
   
   let yPosition = 40;
   
   // HEADER COMPACTO
   this.doc.fontSize(22)
            .fillColor(primaryColor)
            .text('PERDOMO Y ASOCIADOS S. DE R.L', 40, yPosition);

   // ✅ NUEVO: MARCA DE COPIA en la esquina superior derecha
   if (tipo === 'copia') {
     this.doc.fontSize(14)
              .fillColor('#f39c12')
              .text('COPIA', 500, 40, { width: 60, align: 'right' });
   }

   this.doc.fontSize(9)
            .fillColor('#7f8c8d')
            .text('Dirección de la empresa: Col. Sauce', 40, yPosition + 25)
            .text('Teléfono: +504 2443-6618 | Email: perdomoyasociados@gmail.com', 40, yPosition + 37)
            .text('www.perdomoyasociados.com', 40, yPosition + 49);

   yPosition += 70;

   // Línea separadora
   this.doc.strokeColor('#ecf0f1')
            .lineWidth(1.5)
            .moveTo(40, yPosition)
            .lineTo(560, yPosition)
            .stroke();

   yPosition += 15;

   // TÍTULO COMPACTO
   this.doc.fontSize(16)
            .fillColor(primaryColor)
            .text('COTIZACIÓN', 40, yPosition, { align: 'center' });

   yPosition += 20;

   const numeroCotizacion = `CT${String(cotizacion.cotizaciones_id).padStart(6, '0')}`;
   this.doc.fontSize(12)
            .fillColor(secondaryColor)
            .text(numeroCotizacion, 40, yPosition, { align: 'center' });

   yPosition += 30;

   // INFORMACIÓN DEL CLIENTE COMPACTA
   this.doc.fontSize(11)
            .fillColor(primaryColor)
            .text('DATOS DEL CLIENTE:', 40, yPosition);

   yPosition += 12;

   const incluirInfo = {
     encargado: cotizacion.incluir_nombre_encargado,
     empresa: cotizacion.incluir_nombre_empresa,
     documento: cotizacion.incluir_documento_fiscal,
     telefono: cotizacion.incluir_telefono_empresa,
     correo: cotizacion.incluir_correo_empresa
   };

   this.doc.fontSize(9).fillColor('#555');

   if (incluirInfo.encargado) {
     this.doc.text(`Encargado: ${cotizacion.cliente.nombre_encargado}`, 40, yPosition);
     yPosition += 10;
   }

   if (incluirInfo.empresa) {
     this.doc.text(`Empresa: ${cotizacion.cliente.nombre_empresa}`, 40, yPosition);
     yPosition += 10;
   }

   if (incluirInfo.documento) {
     this.doc.text(`Documento Fiscal: ${cotizacion.cliente.documento_fiscal}`, 40, yPosition);
     yPosition += 10;
   }

   if (incluirInfo.telefono && cotizacion.cliente.telefono_empresa) {
     this.doc.text(`Teléfono: ${cotizacion.cliente.telefono_empresa}`, 40, yPosition);
     yPosition += 10;
   }

   if (incluirInfo.correo && cotizacion.cliente.correo_empresa) {
     this.doc.text(`Email: ${cotizacion.cliente.correo_empresa}`, 40, yPosition);
     yPosition += 10;
   }

   yPosition += 8;

   // INFORMACIÓN GENERAL
   this.doc.text(`Fecha: ${new Date(cotizacion.fecha_creacion).toLocaleDateString('es-HN')}`, 40, yPosition);
   this.doc.text(`Vendedor: ${cotizacion.vendedor.nombre_completo}`, 300, yPosition);
   yPosition += 15;

   // Línea separadora
   this.doc.strokeColor('#ecf0f1')
            .lineWidth(1)
            .moveTo(40, yPosition)
            .lineTo(560, yPosition)
            .stroke();

   yPosition += 15;

   // SERVICIOS INCLUIDOS
   this.doc.fontSize(11)
            .fillColor(primaryColor)
            .text('SERVICIOS INCLUIDOS:', 40, yPosition);

   yPosition += 15;

   // AGRUPAR DETALLES POR SERVICIO
   const serviciosAgrupados = this._agruparDetallesPorServicio(cotizacion.detalles);
   
   console.log('📊 Servicios agrupados para PDF:', Object.keys(serviciosAgrupados).length);

   let servicioIndex = 1;
   let totalMensualReal = 0;

   for (const [servicioId, servicioData] of Object.entries(serviciosAgrupados)) {
     // NOMBRE DEL SERVICIO COMPACTO
     this.doc.fontSize(10)
              .fillColor(primaryColor)
              .text(`${servicioIndex}. ${servicioData.nombre}`, 40, yPosition);

     yPosition += 12;

     // DESCRIPCIÓN COMPACTA
     if (servicioData.descripcion) {
       this.doc.fontSize(8)
                .fillColor('#666')
                .text(servicioData.descripcion, 60, yPosition, { width: 400 });
       yPosition += 10;
     }

     // CATEGORÍAS COMPACTAS
     const categorias = servicioData.categorias;
     let servicioSubtotalMensual = 0;

     if (categorias.length > 0) {
       for (const categoria of categorias) {
         const { cantidadTexto, costoMensualCategoria } = this._formatearCantidadCategoriaCorregida(categoria);
         servicioSubtotalMensual += costoMensualCategoria;

         this.doc.fontSize(8)
                  .fillColor('#495057')
                  .text(`• ${cantidadTexto}`, 60, yPosition, { width: 480 });

         yPosition += 12;
       }
     }

     // SUBTOTAL COMPACTO
     totalMensualReal += servicioSubtotalMensual;
     
     this.doc.fontSize(9)
              .fillColor(primaryColor)
              .text(`Subtotal ${servicioData.nombre}:`, 60, yPosition, { width: 350 });

     this.doc.fillColor('#e74c3c')
              .text(`$${parseFloat(servicioSubtotalMensual).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mes`, 400, yPosition, { 
                width: 120, 
                align: 'right' 
              });
              
     yPosition += 20;

     // Línea separadora sutil
     this.doc.strokeColor('#ecf0f1')
              .lineWidth(0.5)
              .moveTo(40, yPosition)
              .lineTo(560, yPosition)
              .stroke();

     yPosition += 12;
     servicioIndex++;
   }

   // RESUMEN FINANCIERO COMPACTO
   this.doc.fontSize(11)
            .fillColor(primaryColor)
            .text('RESUMEN FINANCIERO:', 40, yPosition);

   yPosition += 15;

   // EXTRAER AÑOS DEL CONTRATO
   const añosContrato = this._extraerAñosContrato(cotizacion.detalles);
   
   // CÁLCULOS
   const totalMensual = totalMensualReal;
   const totalAnual = totalMensual * 12;
   const totalContrato = totalAnual * añosContrato;

   // Caja compacta para el resumen
   this.doc.rect(40, yPosition, 520, 65)
            .fillAndStroke('#f8f9fa', '#e9ecef');

   yPosition += 12;

   this.doc.fontSize(9)
            .fillColor('#666')
            .text(`Costo mensual promedio:`, 60, yPosition);
   
   this.doc.fillColor('#2980b9')
            .text(`$${parseFloat(totalMensual).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 420, yPosition, { 
              width: 120, 
              align: 'right' 
            });

   yPosition += 15;

   this.doc.fillColor('#666')
            .text(`Costo anual:`, 60, yPosition);
   
   this.doc.fillColor('#27ae60')
            .text(`$${parseFloat(totalAnual).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 420, yPosition, { 
              width: 120, 
              align: 'right' 
            });

   yPosition += 15;

   this.doc.fillColor('#666')
            .text(`Duración del contrato:`, 60, yPosition);
   
   this.doc.fillColor('#8e44ad')
            .text(`${añosContrato} año${añosContrato > 1 ? 's' : ''}`, 420, yPosition, { 
              width: 120, 
              align: 'right' 
            });

   yPosition += 25;

   // TOTAL FINAL COMPACTO
   yPosition += 8;

   this.doc.fontSize(14)
            .fillColor('black')
            .text('TOTAL DEL CONTRATO:', 40, yPosition, { width: 300 });

   this.doc.fontSize(18)
            .fillColor('black')
            .text(`$${parseFloat(totalContrato).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 420, yPosition, { 
              width: 120, 
              align: 'right' 
            });

   yPosition += 30;

   // NOTA DE IMPUESTOS COMPACTA
   this.doc.fontSize(9)
            .fillColor('#e74c3c')
            .text('* Los precios cotizados no incluyen impuestos aplicables según la legislación vigente.', 40, yPosition, { 
              align: 'center',
              width: 520
            });

   yPosition += 25;

   // CONDICIONES COMPACTAS
   this.doc.fontSize(9)
            .fillColor(primaryColor)
            .text('CONDICIONES:', 40, yPosition);

   yPosition += 12;

   this.doc.fontSize(8)
            .fillColor('#666')
            .text('• Esta cotización tiene validez de 15 días calendario a partir de la fecha de emisión.', 40, yPosition)
            .text('• Soporte técnico disponible de lunes a viernes de 8:00 AM a 5:00 PM, sábados de 8:00 AM a 12:00 PM (UTC-6).', 40, yPosition + 10)
            .text('• Los precios cotizados corresponden a la cantidad de equipos especificada. Cualquier variación en el número', 40, yPosition + 20)
            .text('  de equipos al momento de la implementación será facturada según la cantidad real instalada.', 40, yPosition + 30)
            .text('• Las visitas técnicas fuera del área metropolitana de La Ceiba generan costos adicionales.', 40, yPosition + 40)
            .text('• Los impuestos correspondientes (ISV, impuesto sobre la renta, etc.) serán aplicados según la', 40, yPosition + 50)
            .text('  normativa fiscal vigente al momento de la facturación.', 40, yPosition + 60);

   yPosition += 80;

   // FOOTER COMPACTO
   this.doc.fontSize(8)
            .fillColor('#666')
            .text('Para aceptar esta propuesta o solicitar modificaciones, favor confirmar por email o teléfono.', 40, yPosition, {
              align: 'center',
              width: 520
            });
   
   yPosition += 15;
   
   this.doc.fontSize(9)
            .fillColor('#2c3e50')
            .text('¡Gracias por considerar nuestros servicios!', 40, yPosition, {
              align: 'center',
              width: 520
            });

   yPosition += 20;

   // INFORMACIÓN DE CONTACTO FINAL
   this.doc.fontSize(7)
            .fillColor('#999')
            .text('Perdomo y Asociados S. de R.L. | Col. Sauce | Tel: +504 2443-6618', 40, yPosition, {
              align: 'center',
              width: 520
            });

   yPosition += 10;

   this.doc.text('perdomoyasociados@gmail.com | www.perdomoyasociados.com', 40, yPosition, {
     align: 'center',
     width: 520
   });

   // ✅ NUEVO: MARCA DE AGUA PARA COPIAS (opcional, más sutil)
   if (tipo === 'copia') {
     this.doc.fontSize(80)
              .fillColor('#f39c12')
              .opacity(0.08) // Muy sutil para no interferir
              .text('COPIA', 150, 350, {
                rotate: -45,
                align: 'center'
              });
     
     // Restaurar opacidad
     this.doc.opacity(1);
   }
 }

 // Mantener todos los métodos existentes...
 _extraerAñosContrato(detalles) {
   if (detalles && detalles.length > 0) {
     return detalles[0].cantidad_anos || 1;
   }
   return 1;
 }

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
       precio_usado: detalle.precio_usado,
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
     
     const categoriaData = {
       detalles_id: detalle.detalles_id,
       categorias_id: detalle.categorias_id,
       cantidad: detalle.cantidad || 0,
       cantidad_anos: detalle.cantidad_anos || 1,
       precio_usado: detalle.precio_usado || 0,
       subtotal: detalle.subtotal || 0,
       unidad_medida: detalle.unidad_medida || null,
       unidad_medida_servicio: detalle.servicio?.categoria?.unidad_medida || null,
       cantidad_equipos: detalle.cantidad_equipos || 0,
       cantidad_servicios: detalle.cantidad_servicios || 0,
       cantidad_gb: detalle.cantidad_gb || 0
     };

     serviciosAgrupados[servicioId].categorias.push(categoriaData);
   });

   console.log('✅ Servicios agrupados exitosamente:', Object.keys(serviciosAgrupados));
   return serviciosAgrupados;
 }

 _formatearCantidadCategoriaCorregida(categoria) {
   console.log('🔍 DEBUG: Formateando categoría CORREGIDA:', categoria);

   const cantidad = categoria.cantidad || 0;
   const años = categoria.cantidad_anos || 1;
   const precioUsado = categoria.precio_usado || 0;
   
   let unidadMedida = categoria.unidad_medida;
   
   if (!unidadMedida && categoria.unidad_medida_servicio) {
     unidadMedida = categoria.unidad_medida_servicio;
     console.log('📋 Usando unidad de medida del servicio como fallback');
   }

   let cantidadTexto = '';
   let descripcionUnidad = '';

   if (unidadMedida && cantidad > 0) {
     const nombreUnidad = unidadMedida.nombre || 'Unidades';
     const abreviacion = unidadMedida.abreviacion || '';
     const tipoUnidad = unidadMedida.tipo || 'cantidad';
     
     console.log(`📏 Usando unidad: ${nombreUnidad} (${tipoUnidad}) - ${cantidad} ${abreviacion}`);
     
     switch (tipoUnidad) {
       case 'capacidad':
         descripcionUnidad = `${nombreUnidad}: ${cantidad} ${abreviacion}`;
         break;
       case 'usuarios':
         descripcionUnidad = `${nombreUnidad}: ${cantidad}`;
         break;
       case 'sesiones':
         descripcionUnidad = `${nombreUnidad}: ${cantidad}`;
         break;
       case 'tiempo':
         descripcionUnidad = `${nombreUnidad}: ${cantidad} ${abreviacion}`;
         break;
       case 'cantidad':
       default:
         descripcionUnidad = `${nombreUnidad}: ${cantidad}`;
         break;
     }
   } else {
     console.log('⚠️ Sin unidad de medida, usando datos legacy');
     
     if (cantidad > 0) {
       descripcionUnidad = `Cantidad: ${cantidad}`;
     } else if (categoria.cantidad_servicios > 0) {
       descripcionUnidad = `Servicios: ${categoria.cantidad_servicios}`;
       cantidad = categoria.cantidad_servicios;
     } else if (categoria.cantidad_gb > 0) {
       descripcionUnidad = `Almacenamiento: ${categoria.cantidad_gb} GB`;
       cantidad = categoria.cantidad_gb;
     } else {
       descripcionUnidad = 'Servicio contratado';
       cantidad = 1;
     }
   }

   if (categoria.cantidad_equipos > 0) {
     descripcionUnidad += ` | Equipos adicionales: ${categoria.cantidad_equipos}`;
   }

   let costoMensualCategoria = 0;

   if (precioUsado > 0 && cantidad > 0) {
     const precioMensualUnitario = precioUsado;
     costoMensualCategoria = precioMensualUnitario * cantidad;
     const costoAnualTotal = costoMensualCategoria * 12;
     const costoTotalContrato = costoAnualTotal * años;
     
     cantidadTexto = `${descripcionUnidad} | `;
     cantidadTexto += `$${precioMensualUnitario.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mes`;
     
     if (cantidad > 1) {
       cantidadTexto += ` × ${cantidad} = $${costoMensualCategoria.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mes`;
     }
     
     cantidadTexto += ` × 12 meses = $${costoAnualTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/año`;
     
     if (años > 1) {
       cantidadTexto += ` × ${años} años = $${costoTotalContrato.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
     }
   } else {
     cantidadTexto = `${descripcionUnidad} | Duración: ${años} año${años > 1 ? 's' : ''}`;
   }

   console.log('✅ Texto final formateado CORREGIDO:', cantidadTexto);
   console.log('✅ Costo mensual categoría:', costoMensualCategoria);
   
   return {
     cantidadTexto,
     costoMensualCategoria
   };
 }

 _formatearCantidadCategoria(categoria) {
   const { cantidadTexto } = this._formatearCantidadCategoriaCorregida(categoria);
   return cantidadTexto;
 }
}

module.exports = new PDFGenerator();