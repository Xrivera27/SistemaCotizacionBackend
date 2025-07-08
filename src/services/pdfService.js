const PDFDocument = require('pdfkit');

class PDFService {
  
  async generarReportePDF(tipoReporte, datosReporte, filtros) {
    try {
      console.log('📄 Generando PDF para reporte:', tipoReporte);
      
      // Crear documento PDF
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
      
      // Buffer para almacenar el PDF
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      
      // Promesa que se resuelve cuando termina la generación
      const pdfPromise = new Promise((resolve) => {
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
      });
      
      // Generar contenido del PDF
      this.generarContenidoPDF(doc, tipoReporte, datosReporte, filtros);
      
      // Finalizar documento
      doc.end();
      
      // Esperar a que termine la generación
      const pdfBuffer = await pdfPromise;
      
      return {
        buffer: pdfBuffer,
        filename: `reporte-${tipoReporte}-${new Date().toISOString().split('T')[0]}.pdf`,
        contentType: 'application/pdf'
      };
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      throw new Error('Error al generar PDF: ' + error.message);
    }
  }
  
  generarContenidoPDF(doc, tipo, datos, filtros) {
    // Header del documento
    this.agregarHeader(doc, tipo, filtros);
    
    // Contenido según el tipo de reporte
    switch (tipo) {
      case 'cotizaciones':
        this.generarPDFCotizaciones(doc, datos);
        break;
      case 'vendedores':
        this.generarPDFVendedores(doc, datos);
        break;
      case 'servicios':
        this.generarPDFServicios(doc, datos);
        break;
      case 'clientes':
        this.generarPDFClientes(doc, datos);
        break;
      case 'financiero':
        this.generarPDFFinanciero(doc, datos);
        break;
      default:
        doc.text('Tipo de reporte no reconocido', { align: 'center' });
    }
  }
  
  agregarHeader(doc, tipo, filtros) {
    const fechaActual = new Date().toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Título principal
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('Sistema de Cotizaciones', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Subtítulo
    doc.fontSize(16)
       .text(`Reporte de ${this.getTipoNombre(tipo)}`, { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Información del reporte
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Fecha de generación: ${fechaActual}`, { align: 'center' });
    
    const periodo = this.getDescripcionPeriodo(filtros);
    doc.text(`Período: ${periodo}`, { align: 'center' });
    
    // Línea separadora
    doc.moveDown(1);
    doc.strokeColor('#3498db')
       .lineWidth(2)
       .moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke();
    
    doc.moveDown(1);
  }
  
  generarPDFCotizaciones(doc, datos) {
    // Resumen en rectángulos
    const startY = doc.y;
    const boxWidth = 120;
    const boxHeight = 60;
    const spacing = 10;
    
    const resumenes = [
      { label: 'Total Cotizaciones', valor: datos.totalCotizaciones || 0, color: '#3498db' },
      { label: 'Efectivas', valor: datos.cotizacionesEfectivas || 0, color: '#27ae60' },
      { label: 'Pendientes', valor: datos.cotizacionesPendientes || 0, color: '#f39c12' },
      { label: 'Canceladas', valor: datos.cotizacionesCanceladas || 0, color: '#e74c3c' }
    ];
    
    resumenes.forEach((item, index) => {
      const x = 50 + (index % 4) * (boxWidth + spacing);
      const y = startY + Math.floor(index / 4) * (boxHeight + spacing);
      
      // Rectángulo
      doc.rect(x, y, boxWidth, boxHeight)
         .strokeColor(item.color)
         .lineWidth(2)
         .stroke();
      
      // Valor
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor(item.color)
         .text(item.valor.toString(), x + 10, y + 10, { width: boxWidth - 20, align: 'center' });
      
      // Label
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#000')
         .text(item.label, x + 10, y + 35, { width: boxWidth - 20, align: 'center' });
    });
    
    doc.moveDown(3);
    
    // Ingresos totales (más grande)
    if (datos.ingresosTotales) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text(`Ingresos Totales: ${this.formatearMoneda(datos.ingresosTotales)}`, { align: 'center' });
      doc.moveDown(1);
    }
    
    // Tabla de cotizaciones
    if (datos.detalleCotizaciones && datos.detalleCotizaciones.length > 0) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Detalle de Cotizaciones', { align: 'left' });
      
      doc.moveDown(0.5);
      
      this.generarTabla(doc, 
        ['CT#', 'Cliente', 'Vendedor', 'Fecha', 'Total', 'Estado'],
        datos.detalleCotizaciones.map(cot => [
          `CT${String(cot.id).padStart(6, '0')}`,
          cot.cliente.substring(0, 15) + (cot.cliente.length > 15 ? '...' : ''),
          cot.vendedor.substring(0, 12) + (cot.vendedor.length > 12 ? '...' : ''),
          this.formatearFecha(cot.fecha),
          this.formatearMoneda(cot.total),
          this.getEstadoTexto(cot.estado)
        ])
      );
    }
  }
  
  generarPDFVendedores(doc, datos) {
    if (!datos.rendimientoVendedores || datos.rendimientoVendedores.length === 0) {
      doc.text('No hay datos de vendedores para mostrar', { align: 'center' });
      return;
    }
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Rendimiento por Vendedor', { align: 'left' });
    
    doc.moveDown(0.5);
    
    this.generarTabla(doc,
      ['Vendedor', 'Cotizaciones', 'Efectivas', 'Conversión', 'Ingresos'],
      datos.rendimientoVendedores.map(v => [
        v.nombre.substring(0, 20),
        v.cotizaciones.toString(),
        v.efectivas.toString(),
        `${v.conversion}%`,
        this.formatearMoneda(v.ingresos)
      ])
    );
  }
  
  generarPDFServicios(doc, datos) {
    if (!datos.rendimientoServicios || datos.rendimientoServicios.length === 0) {
      doc.text('No hay datos de servicios para mostrar', { align: 'center' });
      return;
    }
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Rendimiento por Servicio', { align: 'left' });
    
    doc.moveDown(0.5);
    
    this.generarTabla(doc,
      ['Servicio', 'Categoría', 'Cotizaciones', 'Efectivas', 'Ingresos'],
      datos.rendimientoServicios.map(s => [
        s.nombre.substring(0, 25),
        (s.categoria || 'Sin categoría').substring(0, 15),
        s.cotizaciones.toString(),
        s.efectivas.toString(),
        this.formatearMoneda(s.ingresos)
      ])
    );
  }
  
  generarPDFClientes(doc, datos) {
    if (!datos.actividadClientes || datos.actividadClientes.length === 0) {
      doc.text('No hay datos de clientes para mostrar', { align: 'center' });
      return;
    }
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Actividad por Cliente', { align: 'left' });
    
    doc.moveDown(0.5);
    
    this.generarTabla(doc,
      ['Cliente', 'Empresa', 'Cotizaciones', 'Total Facturado'],
      datos.actividadClientes.map(c => [
        c.nombreEncargado.substring(0, 20),
        c.empresa.substring(0, 20),
        c.totalCotizaciones.toString(),
        this.formatearMoneda(c.totalFacturado)
      ])
    );
  }
  
  generarPDFFinanciero(doc, datos) {
    if (!datos.financiero) {
      doc.text('No hay datos financieros para mostrar', { align: 'center' });
      return;
    }
    
    // Resumen financiero
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Resumen Financiero', { align: 'left' });
    
    doc.moveDown(0.5);
    
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Ingresos Brutos: ${this.formatearMoneda(datos.financiero.ingresosBrutos)}`)
       .text(`Promedio Mensual: ${this.formatearMoneda(datos.financiero.promedioMensual)}`)
       .text(`Mejor Mes: ${datos.financiero.mejorMes || 'Sin datos'}`)
       .text(`Crecimiento: ${datos.financiero.crecimiento || 0}%`);
    
    doc.moveDown(1);
    
    // Tabla de detalles mensuales
    if (datos.financiero.detallesMensuales && datos.financiero.detallesMensuales.length > 0) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Ingresos por Mes', { align: 'left' });
      
      doc.moveDown(0.5);
      
      this.generarTabla(doc,
        ['Mes', 'Cotizaciones', 'Efectivas', 'Ingresos', 'Crecimiento'],
        datos.financiero.detallesMensuales.map(m => [
          m.mes,
          m.cotizaciones.toString(),
          m.efectivas.toString(),
          this.formatearMoneda(m.ingresos),
          `${m.crecimiento > 0 ? '+' : ''}${m.crecimiento}%`
        ])
      );
    }
  }
  
  generarTabla(doc, headers, rows) {
    const startX = 50;
    const startY = doc.y;
    const rowHeight = 20;
    const colWidth = (550 - 50) / headers.length;
    
    // Headers
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#fff');
    
    headers.forEach((header, i) => {
      const x = startX + (i * colWidth);
      // Fondo azul para headers
      doc.rect(x, startY, colWidth, rowHeight)
         .fillAndStroke('#3498db', '#3498db');
      
      doc.text(header, x + 5, startY + 6, {
        width: colWidth - 10,
        align: 'left'
      });
    });
    
    // Filas
    doc.fillColor('#000')
       .font('Helvetica');
    
    rows.forEach((row, rowIndex) => {
      const y = startY + rowHeight + (rowIndex * rowHeight);
      
      // Alternar colores de fila
      if (rowIndex % 2 === 1) {
        doc.rect(startX, y, colWidth * headers.length, rowHeight)
           .fillAndStroke('#f8f9fa', '#f8f9fa');
      }
      
      row.forEach((cell, colIndex) => {
        const x = startX + (colIndex * colWidth);
        doc.fontSize(9)
           .fillColor('#000')
           .text(cell.toString(), x + 5, y + 6, {
             width: colWidth - 10,
             align: 'left'
           });
      });
      
      // Verificar si necesitamos nueva página
      if (y > 700) {
        doc.addPage();
        return false; // Salir del loop
      }
    });
    
    doc.y = startY + rowHeight + (rows.length * rowHeight) + 20;
  }
  
  // Métodos auxiliares
  formatearMoneda(valor) {
    if (!valor && valor !== 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(valor);
  }
  
  formatearFecha(fecha) {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
  
  getEstadoTexto(estado) {
    const estados = {
      'efectiva': 'Efectiva',
      'pendiente': 'Pendiente',
      'pendiente_aprobacion': 'Esperando Aprobación',
      'rechazada': 'Cancelada'
    };
    return estados[estado] || estado;
  }
  
  getTipoNombre(tipo) {
    const tipos = {
      'cotizaciones': 'Cotizaciones',
      'vendedores': 'Vendedores',
      'servicios': 'Servicios',
      'clientes': 'Clientes',
      'financiero': 'Financiero'
    };
    return tipos[tipo] || tipo;
  }
  
  getDescripcionPeriodo(filtros) {
    if (filtros.periodo === 'custom' && filtros.fechaInicio && filtros.fechaFin) {
      return `${this.formatearFecha(filtros.fechaInicio)} al ${this.formatearFecha(filtros.fechaFin)}`;
    }
    return `Últimos ${filtros.periodo || 30} días`;
  }
}

module.exports = new PDFService();
