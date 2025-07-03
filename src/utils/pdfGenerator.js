// utils/pdfGenerator.js
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
  
  // Construir el contenido del PDF
  async _construirPDF(cotizacion) {
    // Configurar colores
    const primaryColor = '#2c3e50';
    const secondaryColor = '#3498db';
    const accentColor = '#27ae60';
    
    let yPosition = 50;
    
    // HEADER MEJORADO
    this.doc.fontSize(24)
             .fillColor(primaryColor)
             .text('EMPRESA SERVICIOS', 50, yPosition);

    this.doc.fontSize(10)
             .fillColor('#7f8c8d')
             .text('Dirección de la empresa', 50, yPosition + 30)
             .text('Teléfono: +504 1234-5678 | Email: contacto@empresa.com', 50, yPosition + 45)
             .text('www.empresaservicios.com', 50, yPosition + 60);

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

    // SERVICIOS INCLUIDOS
    this.doc.fontSize(12)
             .fillColor(primaryColor)
             .text('SERVICIOS INCLUIDOS:', 50, yPosition);

    yPosition += 20;

    cotizacion.detalles.forEach((detalle, index) => {
      // Verificar si necesitamos nueva página
      if (yPosition > 700) {
        this.doc.addPage();
        yPosition = 50;
      }

      // Nombre del servicio
      this.doc.fontSize(11)
               .fillColor(primaryColor)
               .text(`${index + 1}. ${detalle.servicio.nombre}`, 50, yPosition);

      yPosition += 15;

      // Descripción
      this.doc.fontSize(9)
               .fillColor('#666')
               .text(detalle.servicio.descripcion || 'Sin descripción', 70, yPosition, { width: 400 });

      yPosition += 12;

      // CANTIDADES DETALLADAS - INCLUYE AÑOS
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
      
      // MOSTRAR AÑOS SIEMPRE
      const anos = detalle.cantidad_anos || 1;
      if (cantidadTexto) cantidadTexto += ' | ';
      cantidadTexto += `Años: ${anos}`;

      this.doc.fontSize(10)
               .fillColor(primaryColor)
               .text(cantidadTexto, 70, yPosition);

      // Precio alineado a la derecha
      this.doc.text(`$${parseFloat(detalle.subtotal).toLocaleString()}`, 450, yPosition, { 
        width: 100, 
        align: 'right' 
      });

      yPosition += 20;

      // Línea separadora sutil
      this.doc.strokeColor('#ecf0f1')
               .lineWidth(0.5)
               .moveTo(50, yPosition)
               .lineTo(550, yPosition)
               .stroke();

      yPosition += 10;
    });

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
}

module.exports = new PDFGenerator();