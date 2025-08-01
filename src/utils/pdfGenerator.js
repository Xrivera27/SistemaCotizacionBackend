// utils/pdfGenerator.js - ACTUALIZADO PARA MANEJAR DESCUENTOS Y MESES GRATIS
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {

constructor() {
  this.doc = null;
  this.pageMargin = 40;
  this.currentY = this.pageMargin;
}

// Agregar parámetro tipo para manejar COPIA
async generarCotizacionPDF(cotizacion, tipo = 'original', outputPath = null) {
  try {
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
    
    await this._construirPDF(cotizacion, tipo);
    
    this.doc.end();
    
    // Esperar a que se complete la generación
    return new Promise((resolve, reject) => {
      this.doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      this.doc.on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    throw error;
  }
}

// 🔧 ACTUALIZADO: Incluir lógica de descuentos porcentuales Y meses gratis
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

  // MARCA DE COPIA en la esquina superior derecha
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

  // 🆕 INFORMACIÓN DE DESCUENTOS APLICADOS
  const tieneDescuento = cotizacion.tiene_descuento && parseFloat(cotizacion.descuento_porcentaje) > 0;
  const tieneMesesGratis = cotizacion.tiene_meses_gratis && parseInt(cotizacion.meses_gratis) > 0;

  if (tieneDescuento || tieneMesesGratis) {
    this.doc.fontSize(10)
             .fillColor('#000000')
             .text('BENEFICIOS APLICADOS:', 40, yPosition);
    yPosition += 12;

    if (tieneDescuento) {
      this.doc.fontSize(9)
               .fillColor('#000000')
               .text(`• Descuento: ${cotizacion.descuento_porcentaje}% - ${cotizacion.comentario_descuento}`, 50, yPosition);
      this.doc.text(`  Otorgado por: ${cotizacion.descuento_otorgado_por_nombre}`, 50, yPosition + 10);
      yPosition += 20;
    }

    if (tieneMesesGratis) {
      this.doc.fontSize(9)
               .fillColor('#000000')
               .text(`• Meses gratis: ${cotizacion.meses_gratis} mes${parseInt(cotizacion.meses_gratis) > 1 ? 'es' : ''}`, 50, yPosition);
      if (cotizacion.meses_gratis_otorgado_por_nombre) {
        this.doc.text(`  Otorgado por: ${cotizacion.meses_gratis_otorgado_por_nombre}`, 50, yPosition + 10);
        yPosition += 20;
      } else {
        yPosition += 12;
      }
    }

    yPosition += 8;
  }

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

  // 🔧 RESUMEN FINANCIERO ACTUALIZADO CON DESCUENTOS COMBINADOS
  this.doc.fontSize(11)
           .fillColor(primaryColor)
           .text('RESUMEN FINANCIERO:', 40, yPosition);

  yPosition += 15;

  // Extraer información de la cotización
  const mesesContrato = this._extraerMesesContrato(cotizacion.detalles);
  const mesesGratis = tieneMesesGratis ? parseInt(cotizacion.meses_gratis) : 0;
  const porcentajeDescuento = tieneDescuento ? parseFloat(cotizacion.descuento_porcentaje) : 0;

  // 🔧 CALCULAR TOTALES PASO A PASO PARA MOSTRAR EN PDF
  const totalOriginalVerdadero = cotizacion.total_original ? parseFloat(cotizacion.total_original) : (totalMensualReal * mesesContrato);
  const costoMensualOriginal = totalOriginalVerdadero / mesesContrato;
  
  // PASO 1: Aplicar meses gratis
  const mesesFacturables = mesesContrato - mesesGratis;
  const totalConMesesGratis = costoMensualOriginal * mesesFacturables;
  const ahorroMesesGratis = costoMensualOriginal * mesesGratis;
  
  // PASO 2: Aplicar descuento porcentual
  let totalFinal = totalConMesesGratis;
  let montoDescuentoPorcentual = 0;
  
  if (tieneDescuento) {
    montoDescuentoPorcentual = (totalConMesesGratis * porcentajeDescuento) / 100;
    totalFinal = totalConMesesGratis - montoDescuentoPorcentual;
  }

  // Usar el total de la base de datos como referencia final
  const totalBaseDatos = parseFloat(cotizacion.total);
  const costoMensualFinal = totalBaseDatos / mesesFacturables;

  // 🔧 CAJA DE RESUMEN EXPANDIDA PARA MOSTRAR TODOS LOS CÁLCULOS
  let alturaResumen = 50; // Base
  if (tieneMesesGratis) alturaResumen += 15; // +1 línea para meses gratis
  if (tieneDescuento) alturaResumen += 15; // +1 línea para descuento
  if (tieneMesesGratis || tieneDescuento) alturaResumen += 20; // +1 línea para total original

  this.doc.rect(40, yPosition, 520, alturaResumen)
           .fillAndStroke('#f8f9fa', '#e9ecef');

  yPosition += 12;

  // MOSTRAR TOTAL ORIGINAL SI HAY DESCUENTOS
  if (tieneMesesGratis || tieneDescuento) {
    this.doc.fontSize(9)
             .fillColor('#666')
             .text(`Total original (${mesesContrato} meses):`, 60, yPosition);
    
    this.doc.fillColor('#6c757d')
             .text(`$${totalOriginalVerdadero.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 420, yPosition, { 
               width: 120, 
               align: 'right' 
             });

    yPosition += 15;
  }

  // MOSTRAR MESES GRATIS SI APLICA
  if (tieneMesesGratis) {
    this.doc.fillColor('#666')
             .text(`Meses gratis aplicados (${mesesGratis}):`, 60, yPosition);
    
    this.doc.fillColor('#27ae60')
             .text(`-$${ahorroMesesGratis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 420, yPosition, { 
               width: 120, 
               align: 'right' 
             });

    yPosition += 15;
  }

  // MOSTRAR DESCUENTO PORCENTUAL SI APLICA
  if (tieneDescuento) {
    this.doc.fillColor('#666')
             .text(`Descuento aplicado (${porcentajeDescuento}%):`, 60, yPosition);
    
    this.doc.fillColor('#e74c3c')
             .text(`-$${montoDescuentoPorcentual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 420, yPosition, { 
               width: 120, 
               align: 'right' 
             });

    yPosition += 15;
  }

  // COSTO MENSUAL FINAL
  this.doc.fillColor('#666')
           .text(`Costo mensual final:`, 60, yPosition);
  
  this.doc.fillColor('#2980b9')
           .text(`$${costoMensualFinal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 420, yPosition, { 
             width: 120, 
             align: 'right' 
           });

  yPosition += 15;

  // MESES A FACTURAR
  this.doc.fillColor('#666')
           .text(`Meses a facturar:`, 60, yPosition);
  
  this.doc.fillColor('#8e44ad')
           .text(`${mesesFacturables} mes${mesesFacturables > 1 ? 'es' : ''}`, 420, yPosition, { 
             width: 120, 
             align: 'right' 
           });

  yPosition += 20;

  // 🔧 TOTAL FINAL DESTACADO
  yPosition += 15;

  this.doc.fontSize(14)
           .fillColor('black')
           .text('TOTAL DEL CONTRATO:', 40, yPosition, { width: 300 });

  this.doc.fontSize(18)
           .fillColor('black')
           .text(`$${totalBaseDatos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 420, yPosition, { 
             width: 120, 
             align: 'right' 
           });

  // 🆕 MOSTRAR AHORRO TOTAL SI HAY DESCUENTOS
  if (tieneMesesGratis || tieneDescuento) {
    const ahorroTotal = totalOriginalVerdadero - totalBaseDatos;
    yPosition += 25;
    
    this.doc.fontSize(10)
             .fillColor('#27ae60')
             .text(`Ahorro total para el cliente: $${ahorroTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 40, yPosition, { 
               align: 'center',
               width: 520
             });

    // Desglose del ahorro
    yPosition += 15;
    let desglose = '';
    if (tieneMesesGratis && tieneDescuento) {
      desglose = `(${mesesGratis} meses gratis + ${porcentajeDescuento}% descuento)`;
    } else if (tieneMesesGratis) {
      desglose = `(${mesesGratis} meses gratis)`;
    } else if (tieneDescuento) {
      desglose = `(${porcentajeDescuento}% descuento)`;
    }
    
    this.doc.fontSize(8)
             .fillColor('#666')
             .text(desglose, 40, yPosition, { 
               align: 'center',
               width: 520
             });
  }

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

  // 🆕 CONDICIÓN ESPECIAL PARA MESES GRATIS
  if (tieneMesesGratis) {
    this.doc.text('• Los meses gratis aplicados se descontarán al inicio del período contractual.', 40, yPosition + 70);
    yPosition += 10;
  }

  this.doc.text('• El contrato se factura mensualmente según la duración especificada en la cotización.', 40, yPosition + 70);

  yPosition += 90;

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

  // MARCA DE AGUA PARA COPIAS (opcional, más sutil)
  if (tipo === 'copia') {
    this.doc.fontSize(80)
             .fillColor('#f39c12')
             .opacity(0.08)
             .text('COPIA', 150, 350, {
               rotate: -45,
               align: 'center'
             });
    
    // Restaurar opacidad
    this.doc.opacity(1);
  }
}

// Extraer meses del contrato
_extraerMesesContrato(detalles) {
  if (detalles && detalles.length > 0) {
    // cantidad_anos ahora contiene meses, no años
    return detalles[0].cantidad_anos || 1;
  }
  return 1;
}

_agruparDetallesPorServicio(detalles) {
  const serviciosAgrupados = {};
  
  detalles.forEach((detalle, index) => {
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
      cantidad_meses: detalle.cantidad_anos || 1,
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

  return serviciosAgrupados;
}

// Formatear cantidad con cálculos mensuales
_formatearCantidadCategoriaCorregida(categoria) {
  const cantidad = categoria.cantidad || 0;
  const meses = categoria.cantidad_meses || 1;
  const precioUsado = categoria.precio_usado || 0;
  
  let unidadMedida = categoria.unidad_medida;
  
  if (!unidadMedida && categoria.unidad_medida_servicio) {
    unidadMedida = categoria.unidad_medida_servicio;
  }

  let cantidadTexto = '';
  let descripcionUnidad = '';

  if (unidadMedida && cantidad > 0) {
    const nombreUnidad = unidadMedida.nombre || 'Unidades';
    const abreviacion = unidadMedida.abreviacion || '';
    const tipoUnidad = unidadMedida.tipo || 'cantidad';
    
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
    const costoTotalContrato = costoMensualCategoria * meses;
    
    cantidadTexto = `${descripcionUnidad} | `;
    cantidadTexto += `$${precioMensualUnitario.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mes`;
    
    if (cantidad > 1) {
      cantidadTexto += ` × ${cantidad} = $${costoMensualCategoria.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mes`;
    }
    
    if (meses > 1) {
      cantidadTexto += ` × ${meses} meses = $${costoTotalContrato.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  } else {
    cantidadTexto = `${descripcionUnidad} | Duración: ${meses} mes${meses > 1 ? 'es' : ''}`;
  }
  
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