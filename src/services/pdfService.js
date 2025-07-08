const puppeteer = require('puppeteer');

class PDFService {
  
  async generarReportePDF(tipoReporte, datosReporte, filtros) {
    let browser;
    try {
      console.log('📄 Generando PDF para reporte:', tipoReporte);
      
      // Generar HTML del reporte
      const htmlContent = this.generarHTMLReporte(tipoReporte, datosReporte, filtros);
      
      // Configurar Puppeteer para producción
      const isProduction = process.env.NODE_ENV === 'production';
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        // En producción, usar Chrome instalado por puppeteer
        executablePath: isProduction ? undefined : undefined,
        timeout: 30000
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // Generar PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        timeout: 30000
      });
      
      return {
        buffer: pdfBuffer,
        filename: `reporte-${tipoReporte}-${new Date().toISOString().split('T')[0]}.pdf`,
        contentType: 'application/pdf'
      };
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      throw new Error('Error al generar PDF: ' + error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  generarHTMLReporte(tipo, datos, filtros) {
    const fechaActual = new Date().toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const periodo = this.getDescripcionPeriodo(filtros);
    
    let contenidoReporte = '';
    
    switch (tipo) {
      case 'cotizaciones':
        contenidoReporte = this.generarHTMLCotizaciones(datos);
        break;
      case 'vendedores':
        contenidoReporte = this.generarHTMLVendedores(datos);
        break;
      case 'servicios':
        contenidoReporte = this.generarHTMLServicios(datos);
        break;
      case 'clientes':
        contenidoReporte = this.generarHTMLClientes(datos);
        break;
      case 'financiero':
        contenidoReporte = this.generarHTMLFinanciero(datos);
        break;
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte ${tipo}</title>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            line-height: 1.4;
            color: #2c3e50;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #3498db; 
            padding-bottom: 15px; 
          }
          .header h1 { 
            color: #2c3e50; 
            margin: 0; 
            font-size: 28px;
            font-weight: bold;
          }
          .header p { 
            color: #7f8c8d; 
            margin: 5px 0; 
            font-size: 14px;
          }
          .table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .table th { 
            background: linear-gradient(135deg, #3498db, #2980b9); 
            color: white; 
            padding: 12px 8px; 
            text-align: left; 
            font-weight: bold;
            font-size: 12px;
          }
          .table td { 
            padding: 10px 8px; 
            border-bottom: 1px solid #ecf0f1; 
            font-size: 11px;
          }
          .table tr:nth-child(even) { background: #f8f9fa; }
          .table tr:hover { background: #e8f4fd; }
          .table tfoot td {
            background: #ecf0f1;
            font-weight: bold;
            border-top: 2px solid #3498db;
          }
          .resumen { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
            gap: 15px; 
            margin: 20px 0; 
          }
          .resumen-item { 
            background: #f8f9fa; 
            padding: 15px; 
            border-left: 4px solid #3498db; 
            border-radius: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .resumen-label { 
            font-weight: bold; 
            color: #2c3e50; 
            font-size: 12px;
            margin-bottom: 5px;
          }
          .resumen-valor { 
            font-size: 18px; 
            font-weight: bold;
            margin-top: 5px; 
          }
          .estado-efectiva, .efectivas { color: #27ae60; }
          .estado-pendiente, .pendientes { color: #f39c12; }
          .estado-cancelada, .canceladas { color: #e74c3c; }
          .ingresos { color: #8e44ad; }
          .positivo { color: #27ae60; }
          .negativo { color: #e74c3c; }
          h3 { 
            color: #2c3e50; 
            border-bottom: 2px solid #ecf0f1; 
            padding-bottom: 10px;
            margin-top: 30px;
          }
          .vendedor-info strong { color: #2c3e50; }
          .vendedor-info small { color: #7f8c8d; }
          .no-data {
            text-align: center;
            padding: 40px;
            color: #7f8c8d;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sistema de Cotizaciones</h1>
          <p><strong>Reporte de ${this.getTipoNombre(tipo)}</strong></p>
          <p>Fecha de generación: ${fechaActual}</p>
          <p>Período: ${periodo}</p>
        </div>
        ${contenidoReporte}
      </body>
      </html>
    `;
  }
  
  generarHTMLCotizaciones(datos) {
    const resumen = `
      <div class="resumen">
        <div class="resumen-item">
          <div class="resumen-label">Total Cotizaciones</div>
          <div class="resumen-valor">${datos.totalCotizaciones || 0}</div>
        </div>
        <div class="resumen-item">
          <div class="resumen-label">Efectivas</div>
          <div class="resumen-valor efectivas">${datos.cotizacionesEfectivas || 0}</div>
        </div>
        <div class="resumen-item">
          <div class="resumen-label">Pendientes</div>
          <div class="resumen-valor pendientes">${datos.cotizacionesPendientes || 0}</div>
        </div>
        <div class="resumen-item">
          <div class="resumen-label">Canceladas</div>
          <div class="resumen-valor canceladas">${datos.cotizacionesCanceladas || 0}</div>
        </div>
        <div class="resumen-item">
          <div class="resumen-label">Ingresos Totales</div>
          <div class="resumen-valor ingresos">${this.formatearMoneda(datos.ingresosTotales)}</div>
        </div>
        <div class="resumen-item">
          <div class="resumen-label">Tasa de Conversión</div>
          <div class="resumen-valor">${datos.tasaConversion || 0}%</div>
        </div>
      </div>
    `;
    
    if (!datos.detalleCotizaciones || datos.detalleCotizaciones.length === 0) {
      return resumen + '<div class="no-data">No hay cotizaciones para mostrar</div>';
    }
    
    const tabla = `
      <h3>Detalle de Cotizaciones</h3>
      <table class="table">
        <thead>
          <tr>
            <th>CT#</th>
            <th>Cliente</th>
            <th>Vendedor</th>
            <th>Fecha</th>
            <th>Total</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${datos.detalleCotizaciones.map(cot => `
            <tr>
              <td><strong>CT${String(cot.id).padStart(6, '0')}</strong></td>
              <td>${cot.cliente}</td>
              <td>${cot.vendedor}</td>
              <td>${this.formatearFecha(cot.fecha)}</td>
              <td><strong>${this.formatearMoneda(cot.total)}</strong></td>
              <td class="estado-${cot.estado}"><strong>${this.getEstadoTexto(cot.estado)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    return resumen + tabla;
  }
  
  generarHTMLVendedores(datos) {
    if (!datos.rendimientoVendedores || datos.rendimientoVendedores.length === 0) {
      return '<div class="no-data">No hay datos de vendedores para mostrar</div>';
    }
    
    return `
      <h3>Rendimiento por Vendedor</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Vendedor</th>
            <th>Cotizaciones</th>
            <th>Efectivas</th>
            <th>Conversión</th>
            <th>Ingresos</th>
            <th>Ticket Promedio</th>
          </tr>
        </thead>
        <tbody>
          ${datos.rendimientoVendedores.map(v => `
            <tr>
              <td class="vendedor-info">
                <strong>${v.nombre}</strong><br>
                <small>${v.rol}</small>
              </td>
              <td><strong>${v.cotizaciones}</strong></td>
              <td class="efectivas"><strong>${v.efectivas}</strong></td>
              <td><strong>${v.conversion}%</strong></td>
              <td><strong>${this.formatearMoneda(v.ingresos)}</strong></td>
              <td><strong>${this.formatearMoneda(v.ticketPromedio)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
        ${datos.totales ? `
          <tfoot>
            <tr>
              <td><strong>TOTALES</strong></td>
              <td><strong>${datos.totales.cotizaciones}</strong></td>
              <td><strong>${datos.totales.efectivas}</strong></td>
              <td><strong>${datos.totales.conversionPromedio}%</strong></td>
              <td><strong>${this.formatearMoneda(datos.totales.ingresos)}</strong></td>
              <td><strong>${this.formatearMoneda(datos.totales.ticketPromedio)}</strong></td>
            </tr>
          </tfoot>
        ` : ''}
      </table>
    `;
  }
  
  generarHTMLServicios(datos) {
    if (!datos.rendimientoServicios || datos.rendimientoServicios.length === 0) {
      return '<div class="no-data">No hay datos de servicios para mostrar</div>';
    }
    
    return `
      <h3>Rendimiento por Servicio</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Categoría</th>
            <th>Cotizaciones</th>
            <th>Efectivas</th>
            <th>Conversión</th>
            <th>Ingresos</th>
            <th>Precio Promedio</th>
          </tr>
        </thead>
        <tbody>
          ${datos.rendimientoServicios.map(s => `
            <tr>
              <td><strong>${s.nombre}</strong></td>
              <td>${s.categoria || 'Sin categoría'}</td>
              <td><strong>${s.cotizaciones}</strong></td>
              <td class="efectivas"><strong>${s.efectivas}</strong></td>
              <td><strong>${s.conversion}%</strong></td>
              <td><strong>${this.formatearMoneda(s.ingresos)}</strong></td>
              <td><strong>${this.formatearMoneda(s.precioPromedio)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  generarHTMLClientes(datos) {
    if (!datos.actividadClientes || datos.actividadClientes.length === 0) {
      return '<div class="no-data">No hay datos de clientes para mostrar</div>';
    }
    
    return `
      <h3>Actividad por Cliente</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Empresa</th>
            <th>Vendedor Asignado</th>
            <th>Cotizaciones</th>
            <th>Última Cotización</th>
            <th>Total Facturado</th>
          </tr>
        </thead>
        <tbody>
          ${datos.actividadClientes.map(c => `
            <tr>
              <td><strong>${c.nombreEncargado}</strong></td>
              <td>${c.empresa}</td>
              <td>${c.vendedorAsignado}</td>
              <td><strong>${c.totalCotizaciones}</strong></td>
              <td>${this.formatearFecha(c.ultimaCotizacion)}</td>
              <td><strong>${this.formatearMoneda(c.totalFacturado)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  generarHTMLFinanciero(datos) {
    if (!datos.financiero) {
      return '<div class="no-data">No hay datos financieros para mostrar</div>';
    }
    
    const resumen = `
      <div class="resumen">
        <div class="resumen-item">
          <div class="resumen-label">Ingresos Brutos</div>
          <div class="resumen-valor ingresos">${this.formatearMoneda(datos.financiero.ingresosBrutos)}</div>
        </div>
        <div class="resumen-item">
          <div class="resumen-label">Promedio Mensual</div>
          <div class="resumen-valor">${this.formatearMoneda(datos.financiero.promedioMensual)}</div>
        </div>
        <div class="resumen-item">
          <div class="resumen-label">Mejor Mes</div>
          <div class="resumen-valor">${datos.financiero.mejorMes || 'Sin datos'}</div>
        </div>
        <div class="resumen-item">
          <div class="resumen-label">Crecimiento</div>
          <div class="resumen-valor ${(datos.financiero.crecimiento || 0) > 0 ? 'positivo' : 'negativo'}">
            ${(datos.financiero.crecimiento || 0) > 0 ? '+' : ''}${datos.financiero.crecimiento || 0}%
          </div>
        </div>
      </div>
    `;
    
    if (!datos.financiero.detallesMensuales || datos.financiero.detallesMensuales.length === 0) {
      return resumen + '<div class="no-data">No hay detalles mensuales para mostrar</div>';
    }
    
    const tabla = `
      <h3>Ingresos por Mes</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Mes</th>
            <th>Cotizaciones</th>
            <th>Efectivas</th>
            <th>Ingresos</th>
            <th>Crecimiento</th>
          </tr>
        </thead>
        <tbody>
          ${datos.financiero.detallesMensuales.map(m => `
            <tr>
              <td><strong>${m.mes}</strong></td>
              <td><strong>${m.cotizaciones}</strong></td>
              <td class="efectivas"><strong>${m.efectivas}</strong></td>
              <td><strong>${this.formatearMoneda(m.ingresos)}</strong></td>
              <td class="${m.crecimiento > 0 ? 'positivo' : 'negativo'}">
                <strong>${m.crecimiento > 0 ? '+' : ''}${m.crecimiento}%</strong>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    return resumen + tabla;
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
