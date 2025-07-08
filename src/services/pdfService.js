const PDFDocument = require('pdfkit');

class PDFService {
  
  async generarReportePDF(tipoReporte, datosReporte, filtros) {
    try {
      console.log('📄 Generando PDF para reporte:', tipoReporte);
      
      // Crear documento PDF con mejor configuración
      const doc = new PDFDocument({ 
        margin: 40,
        size: 'A4',
        bufferPages: true
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
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('Sistema de Cotizaciones', { align: 'center' });
    
    doc.moveDown(0.3);
    
    // Subtítulo
    doc.fontSize(18)
       .text(`Reporte de ${this.getTipoNombre(tipo)}`, { align: 'center' });
    
    doc.moveDown(0.3);
    
    // Información del reporte
    doc.fontSize(11)
       .font('Helvetica')
       .text(`Fecha de generación: ${fechaActual}`, { align: 'center' });
    
    const periodo = this.getDescripcionPeriodo(filtros);
    doc.text(`Período: ${periodo}`, { align: 'center' });
    
    // Línea separadora
    doc.moveDown(0.8);
    const currentY = doc.y;
    doc.strokeColor('#3498db')
       .lineWidth(3)
       .moveTo(40, currentY)
       .lineTo(555, currentY)
       .stroke();
    
    doc.moveDown(1);
  }
  
  generarPDFCotizaciones(doc, datos) {
    // Resumen en rectángulos compactos
    const startY = doc.y;
    const resumenes = [
      { label: 'Total Cotizaciones', valor: datos.totalCotizaciones || 0, color: '#3498db' },
      { label: 'Efectivas', valor: datos.cotizacionesEfectivas || 0, color: '#27ae60' },
      { label: 'Pendientes', valor: datos.cotizacionesPendientes || 0, color: '#f39c12' },
      { label: 'Canceladas', valor: datos.cotizacionesCanceladas || 0, color: '#e74c3c' }
    ];
    
    // Dibujar resumen en una fila
    const boxWidth = 120;
    const boxHeight = 50;
    const spacing = 8;
    const totalWidth = (boxWidth * 4) + (spacing * 3);
    const startX = (555 - totalWidth) / 2 + 40; // Centrar
    
    resumenes.forEach((item, index) => {
      const x = startX + (index * (boxWidth + spacing));
      
      // Rectángulo con borde coloreado
      doc.rect(x, startY, boxWidth, boxHeight)
         .strokeColor(item.color)
         .lineWidth(2)
         .stroke();
      
      // Valor grande
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(item.color)
         .text(item.valor.toString(), x + 5, startY + 8, { 
           width: boxWidth - 10, 
           align: 'center' 
         });
      
      // Label pequeño
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#000')
         .text(item.label, x + 5, startY + 32, { 
           width: boxWidth - 10, 
           align: 'center' 
         });
    });
    
    doc.y = startY + boxHeight + 20;
    
    // Ingresos totales destacado
    if (datos.ingresosTotales) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#8e44ad')
         .text(`Ingresos Totales: ${this.formatearMoneda(datos.ingresosTotales)}`, { 
           align: 'center' 
         });
      doc.moveDown(0.8);
    }
    
    // Tabla de cotizaciones mejorada - SIN TRUNCAR
    if (datos.detalleCotizaciones && datos.detalleCotizaciones.length > 0) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#000')
         .text('Detalle de Cotizaciones');
      
      doc.moveDown(0.5);
      
      // Configuración de tabla AMPLIADA para mostrar texto completo
      const headers = ['CT#', 'Cliente', 'Vendedor', 'Fecha', 'Total', 'Estado'];
      const colWidths = [65, 160, 130, 65, 75, 150]; // CT# más ancho, Estado con más espacio
      
      // Preparar datos SIN TRUNCAR - mostrar texto completo
      const rows = datos.detalleCotizaciones.map(cot => [
        `CT${String(cot.id).padStart(6, '0')}`,
        cot.cliente || '', // Texto completo sin truncar
        cot.vendedor || '', // Texto completo sin truncar
        this.formatearFecha(cot.fecha),
        this.formatearMoneda(cot.total),
        this.getEstadoTextoCompleto(cot.estado)
      ]);
      
      this.generarTablaMejoradaConTextoCompleto(doc, headers, rows, colWidths);
    }
  }
  
  generarPDFVendedores(doc, datos) {
    if (!datos.rendimientoVendedores || datos.rendimientoVendedores.length === 0) {
      doc.fontSize(14)
         .text('No hay datos de vendedores para mostrar', { align: 'center' });
      return;
    }
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Rendimiento por Vendedor');
    
    doc.moveDown(0.5);
    
    const headers = ['Vendedor', 'Cotizaciones', 'Efectivas', 'Conversión', 'Ingresos'];
    const colWidths = [220, 80, 70, 70, 85]; // Más espacio para vendedor
    
    const rows = datos.rendimientoVendedores.map(v => [
      v.nombre || '', // Texto completo sin truncar
      v.cotizaciones.toString(),
      v.efectivas.toString(),
      `${v.conversion}%`,
      this.formatearMoneda(v.ingresos)
    ]);
    
    this.generarTablaMejoradaConTextoCompleto(doc, headers, rows, colWidths);
  }
  
  generarPDFServicios(doc, datos) {
    if (!datos.rendimientoServicios || datos.rendimientoServicios.length === 0) {
      doc.fontSize(14)
         .text('No hay datos de servicios para mostrar', { align: 'center' });
      return;
    }
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Rendimiento por Servicio');
    
    doc.moveDown(0.5);
    
    const headers = ['Servicio', 'Categoría', 'Cotizaciones', 'Efectivas', 'Ingresos'];
    const colWidths = [220, 140, 70, 70, 85]; // Más espacio para servicio y categoría
    
    const rows = datos.rendimientoServicios.map(s => [
      s.nombre || '', // Texto completo sin truncar
      s.categoria || 'Sin categoría', // Texto completo sin truncar
      s.cotizaciones.toString(),
      s.efectivas.toString(),
      this.formatearMoneda(s.ingresos)
    ]);
    
    this.generarTablaMejoradaConTextoCompleto(doc, headers, rows, colWidths);
  }
  
  generarPDFClientes(doc, datos) {
    if (!datos.actividadClientes || datos.actividadClientes.length === 0) {
      doc.fontSize(14)
         .text('No hay datos de clientes para mostrar', { align: 'center' });
      return;
    }
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Actividad por Cliente');
    
    doc.moveDown(0.5);
    
    const headers = ['Cliente', 'Empresa', 'Cotizaciones', 'Total Facturado'];
    const colWidths = [200, 220, 70, 85]; // Más espacio para nombres
    
    const rows = datos.actividadClientes.map(c => [
      c.nombreEncargado || '', // Texto completo sin truncar
      c.empresa || '', // Texto completo sin truncar
      c.totalCotizaciones.toString(),
      this.formatearMoneda(c.totalFacturado)
    ]);
    
    this.generarTablaMejoradaConTextoCompleto(doc, headers, rows, colWidths);
  }
  
  generarPDFFinanciero(doc, datos) {
    if (!datos.financiero) {
      doc.fontSize(14)
         .text('No hay datos financieros para mostrar', { align: 'center' });
      return;
    }
    
    // Resumen financiero en rectángulos
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Resumen Financiero');
    
    doc.moveDown(0.5);
    
    const resumenItems = [
      { label: 'Ingresos Brutos', valor: this.formatearMoneda(datos.financiero.ingresosBrutos) },
      { label: 'Promedio Mensual', valor: this.formatearMoneda(datos.financiero.promedioMensual) },
      { label: 'Mejor Mes', valor: datos.financiero.mejorMes || 'Sin datos' },
      { label: 'Crecimiento', valor: `${datos.financiero.crecimiento || 0}%` }
    ];
    
    // Mostrar resumen en formato de lista compacta
    resumenItems.forEach(item => {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`${item.label}: `, { continued: true })
         .font('Helvetica')
         .text(item.valor);
    });
    
    doc.moveDown(1);
    
    // Tabla de detalles mensuales
    if (datos.financiero.detallesMensuales && datos.financiero.detallesMensuales.length > 0) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Ingresos por Mes');
      
      doc.moveDown(0.5);
      
      const headers = ['Mes', 'Cotizaciones', 'Efectivas', 'Ingresos', 'Crecimiento'];
      const colWidths = [120, 85, 75, 100, 90]; // Más espacio para el mes
      
      const rows = datos.financiero.detallesMensuales.map(m => [
        m.mes,
        m.cotizaciones.toString(),
        m.efectivas.toString(),
        this.formatearMoneda(m.ingresos),
        `${m.crecimiento > 0 ? '+' : ''}${m.crecimiento}%`
      ]);
      
      this.generarTablaMejoradaConTextoCompleto(doc, headers, rows, colWidths);
    }
  }
  
  // NUEVA FUNCIÓN para tabla con texto completo (sin truncar)
  generarTablaMejoradaConTextoCompleto(doc, headers, rows, colWidths) {
    const startX = 40;
    let currentY = doc.y;
    const baseRowHeight = 25;
    const headerHeight = 30;
    const pageHeight = 750; // Límite para nueva página
    
    // Headers
    doc.fontSize(11)
       .font('Helvetica-Bold');
    
    // Fondo azul para headers
    doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), headerHeight)
       .fillAndStroke('#3498db', '#3498db');
    
    // Texto de headers en blanco
    doc.fillColor('#fff');
    let x = startX;
    headers.forEach((header, i) => {
      doc.text(header, x + 5, currentY + 8, {
        width: colWidths[i] - 10,
        align: 'left'
      });
      x += colWidths[i];
    });
    
    currentY += headerHeight;
    
    // Filas de datos con altura dinámica
    doc.font('Helvetica')
       .fontSize(10);
    
    rows.forEach((row, rowIndex) => {
      // Calcular altura necesaria para esta fila
      let maxLines = 1;
      row.forEach((cell, colIndex) => {
        const cellText = cell.toString();
        const cellWidth = colWidths[colIndex] - 10;
        const lines = this.calcularLineasTexto(doc, cellText, cellWidth, 10);
        maxLines = Math.max(maxLines, lines);
      });
      
      const rowHeight = Math.max(baseRowHeight, maxLines * 12 + 8);
      
      // Verificar si necesitamos nueva página
      if (currentY + rowHeight > pageHeight) {
        doc.addPage();
        currentY = 80; // Margen superior en nueva página
        
        // Repetir headers en nueva página
        doc.fontSize(11)
           .font('Helvetica-Bold');
        
        doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), headerHeight)
           .fillAndStroke('#3498db', '#3498db');
        
        doc.fillColor('#fff');
        let x = startX;
        headers.forEach((header, i) => {
          doc.text(header, x + 5, currentY + 8, {
            width: colWidths[i] - 10,
            align: 'left'
          });
          x += colWidths[i];
        });
        
        currentY += headerHeight;
        doc.font('Helvetica')
           .fontSize(10);
      }
      
      // Alternar colores de fila
      const fillColor = rowIndex % 2 === 0 ? '#ffffff' : '#f8f9fa';
      doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
         .fillAndStroke(fillColor, '#ecf0f1');
      
      // Contenido de la fila - TEXTO COMPLETO sin truncar
      doc.fillColor('#000');
      let x = startX;
      row.forEach((cell, colIndex) => {
        doc.text(cell.toString(), x + 5, currentY + 6, {
          width: colWidths[colIndex] - 10,
          align: 'left',
          lineGap: 2 // Espaciado entre líneas
        });
        x += colWidths[colIndex];
      });
      
      currentY += rowHeight;
    });
    
    doc.y = currentY + 20;
  }
  
  // Nueva función para calcular líneas de texto
  calcularLineasTexto(doc, texto, ancho, fontSize) {
    if (!texto) return 1;
    
    doc.fontSize(fontSize);
    const lines = doc.heightOfString(texto, { width: ancho });
    return Math.ceil(lines / (fontSize * 1.2)); // 1.2 es el factor de line height
  }
  
  // Métodos auxiliares - SIN TRUNCAR
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
  
  getEstadoTextoCompleto(estado) {
    const estados = {
      'efectiva': 'Efectiva',
      'pendiente': 'Pendiente',
      'pendiente_aprobacion': 'Esperando Aprobación',
      'rechazada': 'Cancelada'
    };
    return estados[estado] || estado;
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
