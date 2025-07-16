// utils/pdfGenerator.js - COMPLETO ACTUALIZADO
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
 
 constructor() {
   this.doc = null;
   this.pageMargin = 50;
   this.currentY = this.pageMargin;
 }
 
 // Crear PDF de cotización
 async generarCotizacionPDF(cotizacion, outputPath = null) {
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
     
     await this._construirPDF(cotizacion);
     
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
 
 // ✅ ACTUALIZADO COMPLETO: Construir el contenido del PDF
 async _construirPDF(cotizacion) {
   // Configurar colores
   const primaryColor = '#2c3e50';
   const secondaryColor = '#3498db';
   const accentColor = '#27ae60';
   
   let yPosition = 50;
   
   // HEADER MEJORADO
   this.doc.fontSize(24)
            .fillColor(primaryColor)
            .text('PERDOMO Y ASOCIADOS S. DE R.L', 50, yPosition);

   this.doc.fontSize(10)
            .fillColor('#7f8c8d')
            .text('Dirección de la empresa: Col. Sauce', 50, yPosition + 30)
            .text('Teléfono: +504 | Email: perdomoyasociados@gmail.com', 50, yPosition + 45)
            .text('www.perdomoyasociados.com', 50, yPosition + 60);

   yPosition += 90;

   // Línea separadora moderna
   this.doc.strokeColor('#ecf0f1')
            .lineWidth(2)
            .moveTo(50, yPosition)
            .lineTo(550, yPosition)
            .stroke();

   yPosition += 20;

   // TÍTULO Y NÚMERO DE COTIZACIÓN CENTRADO
   this.doc.fontSize(18)
            .fillColor(primaryColor)
            .text('COTIZACIÓN', 50, yPosition, { align: 'center' });

   yPosition += 25;

   const numeroCotizacion = `CT${String(cotizacion.cotizaciones_id).padStart(6, '0')}`;
   this.doc.fontSize(14)
            .fillColor(secondaryColor)
            .text(numeroCotizacion, 50, yPosition, { align: 'center' });

   yPosition += 40;

   // INFORMACIÓN DEL CLIENTE
   this.doc.fontSize(12)
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

   this.doc.fontSize(10).fillColor('#555');

   if (incluirInfo.encargado) {
     this.doc.text(`Encargado: ${cotizacion.cliente.nombre_encargado}`, 50, yPosition);
     yPosition += 12;
   }

   if (incluirInfo.empresa) {
     this.doc.text(`Empresa: ${cotizacion.cliente.nombre_empresa}`, 50, yPosition);
     yPosition += 12;
   }

   if (incluirInfo.documento) {
     this.doc.text(`Documento Fiscal: ${cotizacion.cliente.documento_fiscal}`, 50, yPosition);
     yPosition += 12;
   }

   if (incluirInfo.telefono && cotizacion.cliente.telefono_empresa) {
     this.doc.text(`Teléfono: ${cotizacion.cliente.telefono_empresa}`, 50, yPosition);
     yPosition += 12;
   }

   if (incluirInfo.correo && cotizacion.cliente.correo_empresa) {
     this.doc.text(`Email: ${cotizacion.cliente.correo_empresa}`, 50, yPosition);
     yPosition += 12;
   }

   yPosition += 10;

   // INFORMACIÓN GENERAL
   this.doc.text(`Fecha: ${new Date(cotizacion.fecha_creacion).toLocaleDateString('es-HN')}`, 50, yPosition);
   this.doc.text(`Vendedor: ${cotizacion.vendedor.nombre_completo}`, 300, yPosition);
   yPosition += 20;

   // Línea separadora
   this.doc.strokeColor('#ecf0f1')
            .lineWidth(1)
            .moveTo(50, yPosition)
            .lineTo(550, yPosition)
            .stroke();

   yPosition += 20;

   // ✅ NUEVA LÓGICA: SERVICIOS INCLUIDOS CON AGRUPACIÓN POR SERVICIO
   this.doc.fontSize(12)
            .fillColor(primaryColor)
            .text('SERVICIOS INCLUIDOS:', 50, yPosition);

   yPosition += 20;

   // ✅ AGRUPAR DETALLES POR SERVICIO
   const serviciosAgrupados = this._agruparDetallesPorServicio(cotizacion.detalles);
   
   console.log('📊 Servicios agrupados para PDF:', Object.keys(serviciosAgrupados).length);

   let servicioIndex = 1;
   for (const [servicioId, servicioData] of Object.entries(serviciosAgrupados)) {
     // Verificar si necesitamos nueva página
     if (yPosition > 680) {
       this.doc.addPage();
       yPosition = 50;
     }

     // ✅ NOMBRE DEL SERVICIO
     this.doc.fontSize(11)
              .fillColor(primaryColor)
              .text(`${servicioIndex}. ${servicioData.nombre}`, 50, yPosition);

     yPosition += 15;

     // ✅ DESCRIPCIÓN DEL SERVICIO
     if (servicioData.descripcion) {
       this.doc.fontSize(9)
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

         this.doc.fontSize(10)
                  .fillColor('#495057')
                  .text(`• ${cantidadTexto}`, 70, yPosition);

         // Precio de la categoría alineado a la derecha
         this.doc.text(`$${parseFloat(subtotalCategoria).toLocaleString()}`, 450, yPosition, { 
           width: 100, 
           align: 'right' 
         });

         yPosition += 15;
       }
     }

     // ✅ SUBTOTAL DEL SERVICIO
     this.doc.fontSize(10)
              .fillColor(primaryColor)
              

     this.doc.fillColor('#e74c3c')
              
     yPosition += 20;

     // Línea separadora sutil
     this.doc.strokeColor('#ecf0f1')
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
   this.doc.rect(400, yPosition - 5, 150, 25)
            .fillAndStroke('#f8f9fa', '#e9ecef');

   this.doc.fontSize(14)
            .fillColor('#e74c3c')
            .text('TOTAL:', 410, yPosition);

   this.doc.text(`$${parseFloat(cotizacion.total).toLocaleString()}`, 450, yPosition, {
     width: 90,
     align: 'right'
   });

   yPosition += 40;

   // CONDICIONES
   if (yPosition > 650) {
     this.doc.addPage();
     yPosition = 50;
   }

   this.doc.fontSize(10)
            .fillColor(primaryColor)
            .text('CONDICIONES:', 50, yPosition);

   yPosition += 15;

   this.doc.fontSize(9)
            .fillColor('#666')
            .text('• Esta cotización es válida por 30 días a partir de la fecha de emisión', 50, yPosition)
            .text('• Precios incluyen soporte técnico 24/7', 50, yPosition + 12)
            .text('• Los servicios se activarán dentro de 48 horas después de la confirmación', 50, yPosition + 24);

   // FOOTER MODERNO
   this.doc.fontSize(8)
            .fillColor('#999')
            .text('Para aceptar esta propuesta o solicitar modificaciones, favor confirmar por email o teléfono.', 50, 750)
            .text('¡Gracias por considerar nuestros servicios!', 50, 765);
 }

 // ✅ NUEVA FUNCIÓN: Agrupar detalles por servicio
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

 // ✅ NUEVA FUNCIÓN: Formatear cantidad por categoría
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
}

module.exports = new PDFGenerator();