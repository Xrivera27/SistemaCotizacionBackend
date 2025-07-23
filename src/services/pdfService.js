const PDFDocument = require('pdfkit');

class PDFService {
  
  async generarReportePDF(tipoReporte, datosReporte, filtros) {
    try {
      console.log('📄 Generando PDF para reporte:', tipoReporte);
      
      // ✅ ORIENTACIÓN HORIZONTAL para más espacio
      const doc = new PDFDocument({ 
        margin: 30,
        size: 'A4',
        layout: 'landscape', // ← CAMBIO CLAVE: Orientación horizontal
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
    
    // Título principal con mejor espaciado
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('SISTEMA DE COTIZACIONES', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Subtítulo
    doc.fontSize(16)
       .fillColor('#34495e')
       .text(`Reporte de ${this.getTipoNombre(tipo)}`, { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Información del reporte
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#7f8c8d')
       .text(`Fecha de generación: ${fechaActual}`, { align: 'center' });
    
    const periodo = this.getDescripcionPeriodo(filtros);
    doc.text(`Período: ${periodo}`, { align: 'center' });
    
    // Línea separadora más elegante - ajustada para horizontal
    doc.moveDown(1);
    const currentY = doc.y;
    doc.strokeColor('#3498db')
       .lineWidth(2)
       .moveTo(30, currentY)
       .lineTo(812 - 30, currentY) // ← Ajustado para A4 horizontal (842-30)
       .stroke();
    
    doc.moveDown(1.5);
  }
  
  generarPDFCotizaciones(doc, datos) {
    // Resumen en rectángulos mejorados - más anchos para horizontal
    const startY = doc.y;
    const resumenes = [
      { label: 'Total Cotizaciones', valor: datos.totalCotizaciones || 0, color: '#3498db' },
      { label: 'Efectivas', valor: datos.cotizacionesEfectivas || 0, color: '#27ae60' },
      { label: 'Pendientes', valor: datos.cotizacionesPendientes || 0, color: '#f39c12' },
      { label: 'Canceladas', valor: datos.cotizacionesCanceladas || 0, color: '#e74c3c' }
    ];
    
    // Calcular dimensiones para horizontal
    const boxWidth = 180;
    const boxHeight = 60;
    const spacing = 15;
    const totalWidth = (boxWidth * 4) + (spacing * 3);
    const startX = (842 - totalWidth) / 2; // A4 horizontal = 842px ancho
    
    resumenes.forEach((item, index) => {
      const x = startX + (index * (boxWidth + spacing));
      
      // Fondo del rectángulo
      doc.rect(x, startY, boxWidth, boxHeight)
         .fillAndStroke('#f8f9fa', '#ecf0f1');
      
      // Valor grande
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor(item.color)
         .text(item.valor.toString(), x, startY + 10, { 
           width: boxWidth, 
           align: 'center' 
         });
      
      // Label
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#2c3e50')
         .text(item.label, x, startY + 45, { 
           width: boxWidth, 
           align: 'center' 
         });
    });
    
    doc.y = startY + boxHeight + 30;
    
    // Ingresos totales
    if (datos.ingresosTotales) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#8e44ad')
         .text(`Ingresos Totales: ${this.formatearMoneda(datos.ingresosTotales)}`, { 
           align: 'center' 
         });
      doc.moveDown(1);
    }
    
    // Tabla de cotizaciones - COLUMNAS MÁS ANCHAS
    if (datos.detalleCotizaciones && datos.detalleCotizaciones.length > 0) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#2c3e50')
         .text('Detalle de Cotizaciones');
      
      doc.moveDown(0.5);
      
      const headers = ['Código', 'Cliente', 'Vendedor', 'Fecha', 'Total', 'Estado'];
      const colWidths = [80, 200, 180, 90, 100, 100]; // ← Mucho más anchos
      
      const rows = datos.detalleCotizaciones.slice(0, 15).map(cot => [
        `CT${String(cot.id).padStart(4, '0')}`,
        cot.cliente, // ← SIN TRUNCAR
        cot.vendedor.split('(')[0].trim(), // ← SIN TRUNCAR
        this.formatearFecha(cot.fecha),
        this.formatearMoneda(cot.total),
        this.getEstadoTexto(cot.estado)
      ]);
      
      this.generarTablaHorizontal(doc, headers, rows, colWidths);
    }
  }
  
  generarPDFVendedores(doc, datos) {
    if (!datos.rendimientoVendedores || datos.rendimientoVendedores.length === 0) {
      this.mostrarSinDatos(doc, 'vendedores');
      return;
    }
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Rendimiento por Vendedor');
    
    doc.moveDown(0.5);
    
    const headers = ['Vendedor', 'Rol', 'Cotizaciones', 'Efectivas', 'Conversión', 'Ingresos', 'Ticket Promedio'];
    const colWidths = [180, 100, 90, 80, 80, 110, 120]; // ← Columnas más anchas
    
    const rows = datos.rendimientoVendedores.map(v => [
      v.nombre, // ← SIN TRUNCAR
      v.rol,
      v.cotizaciones.toString(),
      v.efectivas.toString(),
      `${v.conversion}%`,
      this.formatearMoneda(v.ingresos),
      this.formatearMoneda(v.ticketPromedio)
    ]);
    
    this.generarTablaHorizontal(doc, headers, rows, colWidths);
    
    // Totales si existen
    if (datos.totales) {
      doc.moveDown(1);
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#2c3e50')
         .text('TOTALES:', 30, doc.y, { continued: true })
         .text(`  ${datos.totales.cotizaciones} cotizaciones | ${datos.totales.efectivas} efectivas | ${this.formatearMoneda(datos.totales.ingresos)} ingresos`);
    }
  }
  
  generarPDFServicios(doc, datos) {
    if (!datos.rendimientoServicios || datos.rendimientoServicios.length === 0) {
      this.mostrarSinDatos(doc, 'servicios');
      return;
    }
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Rendimiento por Servicio (Agrupado)');
    
    doc.moveDown(0.5);
    
    const headers = ['Servicio', 'Categoría', 'Variantes', 'Cotizaciones', 'Efectivas', 'Conversión', 'Ingresos'];
    const colWidths = [280, 140, 70, 80, 80, 80, 100]; // ← MUCHO MÁS ANCHO para servicios
    
    const rows = datos.rendimientoServicios.map(s => [
      s.nombre, // ← SIN TRUNCAR - nombre completo
      s.categoria || 'Sin categoría',
      s.cantidadVariantes.toString(),
      s.cotizaciones.toString(),
      s.efectivas.toString(),
      `${s.conversion}%`,
      this.formatearMoneda(s.ingresos)
    ]);
    
    this.generarTablaHorizontal(doc, headers, rows, colWidths);
  }
  
  generarPDFClientes(doc, datos) {
    if (!datos.actividadClientes || datos.actividadClientes.length === 0) {
      this.mostrarSinDatos(doc, 'clientes');
      return;
    }
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Actividad por Cliente');
    
    doc.moveDown(0.5);
    
    const headers = ['Cliente', 'Empresa', 'Vendedor Asignado', 'Cotizaciones', 'Total Facturado'];
    const colWidths = [160, 200, 160, 100, 130]; // ← Columnas más anchas
    
    const rows = datos.actividadClientes.map(c => [
      c.nombreEncargado, // ← SIN TRUNCAR
      c.empresa, // ← SIN TRUNCAR
      c.vendedorAsignado, // ← SIN TRUNCAR
      c.totalCotizaciones.toString(),
      this.formatearMoneda(c.totalFacturado)
    ]);
    
    this.generarTablaHorizontal(doc, headers, rows, colWidths);
  }
  
  generarPDFFinanciero(doc, datos) {
    if (!datos.financiero) {
      this.mostrarSinDatos(doc, 'financieros');
      return;
    }
    
    // Resumen financiero en cajas - más anchas para horizontal
    const startY = doc.y;
    const items = [
      { label: 'Ingresos Brutos', valor: this.formatearMoneda(datos.financiero.ingresosBrutos), color: '#27ae60' },
      { label: 'Promedio Mensual', valor: this.formatearMoneda(datos.financiero.promedioMensual), color: '#3498db' },
      { label: 'Mejor Mes', valor: datos.financiero.mejorMes || 'Sin datos', color: '#f39c12' },
      { label: 'Crecimiento', valor: `${datos.financiero.crecimiento || 0}%`, color: '#e74c3c' }
    ];
    
    const boxWidth = 180;
    const boxHeight = 50;
    const spacing = 15;
    const totalWidth = (boxWidth * 4) + (spacing * 3);
    const startX = (842 - totalWidth) / 2;
    
    items.forEach((item, index) => {
      const x = startX + (index * (boxWidth + spacing));
      
      doc.rect(x, startY, boxWidth, boxHeight)
         .fillAndStroke('#f8f9fa', '#ecf0f1');
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(item.color)
         .text(item.valor, x, startY + 8, { width: boxWidth, align: 'center' });
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#2c3e50')
         .text(item.label, x, startY + 32, { width: boxWidth, align: 'center' });
    });
    
    doc.y = startY + boxHeight + 30;
    
    // Tabla de detalles mensuales
    if (datos.financiero.detallesMensuales && datos.financiero.detallesMensuales.length > 0) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#2c3e50')
         .text('Detalles Mensuales');
      
      doc.moveDown(0.5);
      
      const headers = ['Mes', 'Cotizaciones', 'Efectivas', 'Ingresos', 'Crecimiento'];
      const colWidths = [160, 120, 120, 140, 120]; // ← Más anchas
      
      const rows = datos.financiero.detallesMensuales.map(m => [
        m.mes,
        m.cotizaciones.toString(),
        m.efectivas.toString(),
        this.formatearMoneda(m.ingresos),
        `${m.crecimiento > 0 ? '+' : ''}${m.crecimiento}%`
      ]);
      
      this.generarTablaHorizontal(doc, headers, rows, colWidths);
    }
  }
  
  // ✅ NUEVA FUNCIÓN PARA TABLAS HORIZONTALES
  generarTablaHorizontal(doc, headers, rows, colWidths) {
    const startX = 30;
    let currentY = doc.y;
    const rowHeight = 25;
    const headerHeight = 30;
    const pageHeight = 550; // ← Menos altura porque es horizontal
    
    // Headers con diseño moderno
    doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), headerHeight)
       .fillAndStroke('#34495e', '#34495e');
    
    doc.fontSize(9) // ← Fuente más pequeña para caber más
       .font('Helvetica-Bold')
       .fillColor('#ffffff');
    
    let x = startX;
    headers.forEach((header, i) => {
      doc.text(header, x + 5, currentY + 10, {
        width: colWidths[i] - 10,
        align: 'center'
      });
      x += colWidths[i];
    });
    
    currentY += headerHeight;
    
    // Filas de datos
    doc.fontSize(8) // ← Fuente más pequeña
       .font('Helvetica');
    
    rows.forEach((row, rowIndex) => {
      // Verificar nueva página
      if (currentY + rowHeight > pageHeight) {
        doc.addPage();
        currentY = 50;
        
        // Repetir headers
        doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), headerHeight)
           .fillAndStroke('#34495e', '#34495e');
        
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#ffffff');
        
        let x = startX;
        headers.forEach((header, i) => {
          doc.text(header, x + 5, currentY + 10, {
            width: colWidths[i] - 10,
            align: 'center'
          });
          x += colWidths[i];
        });
        
        currentY += headerHeight;
        doc.fontSize(8).font('Helvetica');
      }
      
      // Alternar colores de fila
      const fillColor = rowIndex % 2 === 0 ? '#ffffff' : '#f8f9fa';
      doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
         .fillAndStroke(fillColor, '#ecf0f1');
      
      // Contenido de la fila
      doc.fillColor('#2c3e50');
      let x = startX;
      row.forEach((cell, colIndex) => {
        const cellText = cell ? cell.toString() : '';
        doc.text(cellText, x + 5, currentY + 8, {
          width: colWidths[colIndex] - 10,
          align: colIndex === 0 ? 'left' : 'center'
        });
        x += colWidths[colIndex];
      });
      
      currentY += rowHeight;
    });
    
    doc.y = currentY + 20;
  }
  
  mostrarSinDatos(doc, tipo) {
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#7f8c8d')
       .text(`No hay datos de ${tipo} para mostrar en el período seleccionado.`, { 
         align: 'center' 
       });
    doc.moveDown(2);
  }
  
  // Métodos auxiliares (sin cambios)
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  getEstadoTexto(estado) {
    const estados = {
      'efectiva': 'Efectiva',
      'pendiente': 'Pendiente',
      'pendiente_aprobacion': 'Esperando',
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