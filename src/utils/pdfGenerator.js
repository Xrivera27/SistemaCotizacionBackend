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
    this.currentY = this.pageMargin;
    
    // Header con logo de la empresa
    this._agregarHeader();
    
    // Información de la cotización
    this._agregarInfoCotizacion(cotizacion);
    
    // Información del cliente (según configuración)
    this._agregarInfoCliente(cotizacion);
    
    // Tabla de servicios
    this._agregarTablaServicios(cotizacion);
    
    // Totales
    this._agregarTotales(cotizacion);
    
    // Footer
    this._agregarFooter();
  }
  
  // Header del PDF
  _agregarHeader() {
    // Logo de la empresa (si existe)
    const logoPath = path.join(__dirname, '../assets/logo.png');
    if (fs.existsSync(logoPath)) {
      this.doc.image(logoPath, this.pageMargin, this.currentY, { width: 100 });
    }
    
    // Información de la empresa
    this.doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('CLOUDTECH SOLUTIONS', 200, this.currentY)
      .fontSize(12)
      .font('Helvetica')
      .text('Servicios Cloud Empresariales', 200, this.currentY + 25)
      .text('Tel: +504 0000-0000', 200, this.currentY + 40)
      .text('Email: ventas@cloudtech.com', 200, this.currentY + 55);
    
    this.currentY += 100;
    
    // Línea separadora
    this.doc
      .strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(this.pageMargin, this.currentY)
      .lineTo(545, this.currentY)
      .stroke();
    
    this.currentY += 20;
  }
  
  // Información de la cotización
  _agregarInfoCotizacion(cotizacion) {
    const fechaCreacion = new Date(cotizacion.fecha_creacion).toLocaleDateString('es-ES');
    const vigencia = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES');
    
    this.doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(`COTIZACIÓN #${cotizacion.cotizaciones_id}`, this.pageMargin, this.currentY)
      .fontSize(12)
      .font('Helvetica')
      .text(`Fecha: ${fechaCreacion}`, 400, this.currentY)
      .text(`Vigencia: ${vigencia}`, 400, this.currentY + 20);
    
    this.currentY += 60;
  }
  
  // Información del cliente
  _agregarInfoCliente(cotizacion) {
    const cliente = cotizacion.cliente;
    
    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('INFORMACIÓN DEL CLIENTE', this.pageMargin, this.currentY);
    
    this.currentY += 25;
    
    // Mostrar solo la información que está configurada para incluir
    if (cotizacion.incluir_nombre_encargado) {
      this.doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Encargado: ', this.pageMargin, this.currentY)
        .font('Helvetica')
        .text(cliente.nombre_encargado, this.pageMargin + 80, this.currentY);
      this.currentY += 18;
    }
    
    if (cotizacion.incluir_nombre_empresa) {
      this.doc
        .font('Helvetica-Bold')
        .text('Empresa: ', this.pageMargin, this.currentY)
        .font('Helvetica')
        .text(cliente.nombre_empresa, this.pageMargin + 80, this.currentY);
      this.currentY += 18;
    }
    
    if (cotizacion.incluir_documento_fiscal) {
      this.doc
        .font('Helvetica-Bold')
        .text('RTN: ', this.pageMargin, this.currentY)
        .font('Helvetica')
        .text(cliente.documento_fiscal, this.pageMargin + 80, this.currentY);
      this.currentY += 18;
    }
    
    if (cotizacion.incluir_telefono_empresa && cliente.telefono_empresa) {
      this.doc
        .font('Helvetica-Bold')
        .text('Teléfono: ', this.pageMargin, this.currentY)
        .font('Helvetica')
        .text(cliente.telefono_empresa, this.pageMargin + 80, this.currentY);
      this.currentY += 18;
    }
    
    if (cotizacion.incluir_correo_empresa && cliente.correo_empresa) {
      this.doc
        .font('Helvetica-Bold')
        .text('Email: ', this.pageMargin, this.currentY)
        .font('Helvetica')
        .text(cliente.correo_empresa, this.pageMargin + 80, this.currentY);
      this.currentY += 18;
    }
    
    this.currentY += 20;
  }
  
  // Tabla de servicios
  _agregarTablaServicios(cotizacion) {
    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('SERVICIOS COTIZADOS', this.pageMargin, this.currentY);
    
    this.currentY += 25;
    
    // Headers de la tabla
    const tableTop = this.currentY;
    const itemHeight = 30;
    
    this.doc
      .fontSize(10)
      .font('Helvetica-Bold');
    
    // Encabezados
    this._dibujarCelda('Servicio', this.pageMargin, tableTop, 200, itemHeight);
    this._dibujarCelda('Cantidad', this.pageMargin + 200, tableTop, 60, itemHeight);
    this._dibujarCelda('Años', this.pageMargin + 260, tableTop, 40, itemHeight);
    this._dibujarCelda('Precio Unit.', this.pageMargin + 300, tableTop, 80, itemHeight);
    this._dibujarCelda('Subtotal', this.pageMargin + 380, tableTop, 80, itemHeight);
    
    this.currentY = tableTop + itemHeight;
    
    // Filas de servicios
    this.doc.font('Helvetica').fontSize(9);
    
    for (const detalle of cotizacion.detalles) {
      // Verificar si necesitamos una nueva página
      if (this.currentY > 700) {
        this.doc.addPage();
        this.currentY = this.pageMargin;
      }
      
      const servicio = detalle.servicio;
      const totalUnidades = detalle.cantidad_servicios + detalle.cantidad_equipos + detalle.cantidad_gb;
      
      // Nombre del servicio (con descripción si es necesario)
      let nombreCompleto = servicio.nombre;
      if (servicio.categoria && servicio.categoria.nombre === 'backup') {
        nombreCompleto += ` (${detalle.cantidad_gb} GB)`;
      }
      
      this._dibujarCelda(nombreCompleto, this.pageMargin, this.currentY, 200, itemHeight);
      this._dibujarCelda(totalUnidades.toString(), this.pageMargin + 200, this.currentY, 60, itemHeight);
      this._dibujarCelda(detalle.cantidad_anos.toString(), this.pageMargin + 260, this.currentY, 40, itemHeight);
      this._dibujarCelda(`$${detalle.precio_usado.toLocaleString()}`, this.pageMargin + 300, this.currentY, 80, itemHeight);
      this._dibujarCelda(`$${detalle.subtotal.toLocaleString()}`, this.pageMargin + 380, this.currentY, 80, itemHeight);
      
      this.currentY += itemHeight;
    }
    
    this.currentY += 10;
  }
  
  // Totales
  _agregarTotales(cotizacion) {
    const subtotalAnual = cotizacion.total / (cotizacion.detalles[0]?.cantidad_anos || 1);
    
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold');
    
    // Subtotal anual
    this.doc
      .text('Subtotal Anual:', 300, this.currentY)
      .text(`$${subtotalAnual.toLocaleString()}`, 420, this.currentY);
    
    this.currentY += 20;
    
    // Años de contrato
    const añosContrato = cotizacion.detalles[0]?.cantidad_anos || 1;
    this.doc
      .text(`Años de Contrato:`, 300, this.currentY)
      .text(`${añosContrato} año${añosContrato > 1 ? 's' : ''}`, 420, this.currentY);
    
    this.currentY += 25;
    
    // Total final
    this.doc
      .fontSize(14)
      .fillColor('#2c5aa0')
      .text('TOTAL DEL CONTRATO:', 300, this.currentY)
      .text(`$${cotizacion.total.toLocaleString()}`, 420, this.currentY);
    
    this.currentY += 40;
  }
  
  // Footer
  _agregarFooter() {
    const footerY = 720;
    
    this.doc
      .fontSize(10)
      .fillColor('#666666')
      .font('Helvetica')
      .text('Esta cotización es válida por 30 días desde la fecha de emisión.', this.pageMargin, footerY)
      .text('Los precios incluyen soporte técnico 24/7 y actualizaciones automáticas.', this.pageMargin, footerY + 15)
      .text('Para más información, contacte a nuestro equipo de ventas.', this.pageMargin, footerY + 30);
    
    // Línea decorativa
    this.doc
      .strokeColor('#2c5aa0')
      .lineWidth(2)
      .moveTo(this.pageMargin, footerY - 10)
      .lineTo(545, footerY - 10)
      .stroke();
  }
  
  // Función auxiliar para dibujar celdas de tabla
  _dibujarCelda(texto, x, y, width, height) {
    // Borde de la celda
    this.doc
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .rect(x, y, width, height)
      .stroke();
    
    // Texto centrado verticalmente
    const textY = y + (height - 12) / 2;
    
    this.doc
      .fillColor('black')
      .text(texto, x + 5, textY, {
        width: width - 10,
        align: 'left',
        ellipsis: true
      });
  }
}

module.exports = new PDFGenerator();