const { Sequelize, Op } = require('sequelize');
const { sequelize } = require('../models');
const { 
  Cotizacion, 
  CotizacionDetalle, 
  Cliente, 
  Usuario, 
  Servicio, 
  Categoria 
} = require('../models');

class ReportesService {

  // Obtener tipos de reporte disponibles
  getTiposReporte() {
    return [
      {
        id: 'cotizaciones',
        nombre: 'Reporte de Cotizaciones',
        descripcion: 'Estado y resumen de todas las cotizaciones',
        icono: 'fas fa-file-alt'
      },
      {
        id: 'vendedores',
        nombre: 'Reporte de Vendedores',
        descripcion: 'Rendimiento y métricas por vendedor',
        icono: 'fas fa-users'
      },
      {
        id: 'servicios',
        nombre: 'Reporte de Servicios',
        descripcion: 'Análisis de servicios más solicitados',
        icono: 'fas fa-cogs'
      },
      {
        id: 'clientes',
        nombre: 'Reporte de Clientes',
        descripcion: 'Actividad y facturación por cliente',
        icono: 'fas fa-building'
      },
      {
        id: 'financiero',
        nombre: 'Reporte Financiero',
        descripcion: 'Ingresos, tendencias y análisis financiero',
        icono: 'fas fa-chart-line'
      }
    ];
  }

  // Obtener opciones para filtros (vendedores, servicios, clientes)
  async getOpcionesReporte() {
    try {
      // Hacer las queries una por una para debuggear
      const [vendedores] = await sequelize.query(`
        SELECT DISTINCT u.usuarios_id, u.nombre_completo, u.tipo_usuario
        FROM usuarios u
        WHERE u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
        ORDER BY u.nombre_completo
      `);

      // Query para servicios individuales
      const [servicios] = await sequelize.query(`
        SELECT DISTINCT s.servicios_id, s.nombre, c.nombre as categoria
        FROM servicios s
        LEFT JOIN categorias c ON s.categorias_id = c.categorias_id
        WHERE s.estado = 'activo'
        ORDER BY s.nombre
      `);

      const [clientes] = await sequelize.query(`
        SELECT DISTINCT cl.clientes_id, cl.nombre_empresa, cl.nombre_encargado
        FROM clientes cl
        INNER JOIN cotizaciones cot ON cl.clientes_id = cot.clientes_id
        ORDER BY cl.nombre_empresa
      `);

      const [categorias] = await sequelize.query(`
        SELECT categorias_id, nombre
        FROM categorias
        ORDER BY nombre
      `);

      // Agrupar servicios en JavaScript
      const serviciosAgrupados = {};
      servicios.forEach(servicio => {
        const nombreBase = this.extraerNombreBase(servicio.nombre);
        
        // Si no existe el grupo, crearlo
        if (!serviciosAgrupados[nombreBase]) {
          serviciosAgrupados[nombreBase] = {
            id: servicio.servicios_id, // Usar el ID del primer servicio
            nombre: nombreBase,
            categoria: servicio.categoria
          };
        }
      });

      // Convertir objeto a array
      const serviciosFinales = Object.values(serviciosAgrupados);

      return {
        vendedores: vendedores.map(v => ({
          id: v.usuarios_id,
          nombre: v.nombre_completo,
          tipo: v.tipo_usuario
        })),
        servicios: serviciosFinales,
        clientes: clientes.map(c => ({
          id: c.clientes_id,
          empresa: c.nombre_empresa,
          encargado: c.nombre_encargado
        })),
        categorias: categorias.map(c => ({
          id: c.categorias_id,
          nombre: c.nombre
        }))
      };
    } catch (error) {
      console.error('❌ Error detallado en getOpcionesReporte:', error);
      throw new Error('Error al obtener opciones de reporte');
    }
  }

  // Generar reporte principal (dispatcher)
  async generarReporte(tipo, filtros) {
    switch (tipo) {
      case 'cotizaciones':
        return await this.generarReporteCotizaciones(filtros);
      case 'vendedores':
        return await this.generarReporteVendedores(filtros);
      case 'servicios':
        return await this.generarReporteServicios(filtros);
      case 'clientes':
        return await this.generarReporteClientes(filtros);
      case 'financiero':
        return await this.generarReporteFinanciero(filtros);
      default:
        throw new Error('Tipo de reporte no válido');
    }
  }

  // Reporte de Cotizaciones
  async generarReporteCotizaciones(filtros) {
    try {
      const fechas = this.procesarFiltrosFecha(filtros);
      
      // Construir condiciones WHERE
      let whereConditions = `c.created_at BETWEEN '${fechas.inicio}' AND '${fechas.fin}'`;
      
      if (filtros.estado && filtros.estado !== '' && filtros.estado !== null) {
        whereConditions += ` AND c.estado = '${filtros.estado}'`;
      }
      
      if (filtros.vendedor && filtros.vendedor !== '' && filtros.vendedor !== null && !isNaN(parseInt(filtros.vendedor))) {
        whereConditions += ` AND u.usuarios_id = ${parseInt(filtros.vendedor)}`;
      }

      // Resumen general
      const [resumen] = await sequelize.query(`
        SELECT 
          COUNT(*) as totalCotizaciones,
          COUNT(CASE WHEN c.estado = 'efectiva' THEN 1 END) as cotizacionesEfectivas,
          COUNT(CASE WHEN c.estado = 'pendiente' THEN 1 END) as cotizacionesPendientes,
          COUNT(CASE WHEN c.estado = 'pendiente_aprobacion' THEN 1 END) as cotizacionesEsperandoAprobacion,
          COUNT(CASE WHEN c.estado = 'rechazada' THEN 1 END) as cotizacionesCanceladas,
          COALESCE(SUM(CASE WHEN c.estado = 'efectiva' THEN c.total END), 0) as ingresosTotales
        FROM cotizaciones c
        INNER JOIN usuarios u ON c.usuarios_id = u.usuarios_id
        WHERE ${whereConditions}
          AND u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
      `);

      // Calcular tasa de conversión
      const total = parseInt(resumen[0].totalCotizaciones);
      const efectivas = parseInt(resumen[0].cotizacionesEfectivas);
      const tasaConversion = total > 0 ? ((efectivas / total) * 100).toFixed(1) : 0;

      // Detalle de cotizaciones
      const [detalleCotizaciones] = await sequelize.query(`
        SELECT 
          c.cotizaciones_id,
          c.total,
          c.estado,
          c.created_at,
          cl.nombre_empresa as cliente,
          u.nombre_completo as vendedor,
          u.tipo_usuario
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.clientes_id = cl.clientes_id
        LEFT JOIN usuarios u ON c.usuarios_id = u.usuarios_id
        WHERE ${whereConditions}
          AND u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
        ORDER BY c.created_at DESC
        LIMIT 100
      `);

      return {
        totalCotizaciones: parseInt(resumen[0].totalCotizaciones),
        cotizacionesEfectivas: parseInt(resumen[0].cotizacionesEfectivas),
        cotizacionesPendientes: parseInt(resumen[0].cotizacionesPendientes) + parseInt(resumen[0].cotizacionesEsperandoAprobacion),
        cotizacionesCanceladas: parseInt(resumen[0].cotizacionesCanceladas),
        ingresosTotales: parseFloat(resumen[0].ingresosTotales),
        tasaConversion: parseFloat(tasaConversion),
        detalleCotizaciones: detalleCotizaciones.map(item => ({
          id: item.cotizaciones_id,
          cliente: item.cliente || 'Cliente no especificado',
          vendedor: `${item.vendedor} (${this.formatearTipoUsuario(item.tipo_usuario)})`,
          fecha: item.created_at,
          total: parseFloat(item.total),
          estado: item.estado
        })),
        filtros: filtros,
        periodo: fechas
      };
    } catch (error) {
      console.error('Error en generarReporteCotizaciones:', error);
      throw new Error('Error al generar reporte de cotizaciones');
    }
  }

  // Reporte de Vendedores
  async generarReporteVendedores(filtros) {
    try {
      const fechas = this.procesarFiltrosFecha(filtros);
      
      let whereConditions = `c.created_at BETWEEN '${fechas.inicio}' AND '${fechas.fin}'`;
      let vendedorFilter = '';
      
      if (filtros.vendedor && filtros.vendedor !== '' && filtros.vendedor !== null && !isNaN(parseInt(filtros.vendedor))) {
        vendedorFilter = `AND u.usuarios_id = ${parseInt(filtros.vendedor)}`;
      }

      const [rendimientoVendedores] = await sequelize.query(`
        SELECT 
          u.usuarios_id,
          u.nombre_completo,
          u.tipo_usuario,
          COUNT(c.cotizaciones_id) as cotizaciones,
          COUNT(CASE WHEN c.estado = 'efectiva' THEN 1 END) as efectivas,
          COALESCE(SUM(CASE WHEN c.estado = 'efectiva' THEN c.total END), 0) as ingresos,
          CASE 
            WHEN COUNT(c.cotizaciones_id) > 0 
            THEN ROUND((COUNT(CASE WHEN c.estado = 'efectiva' THEN 1 END) * 100.0 / COUNT(c.cotizaciones_id)), 1)
            ELSE 0 
          END as conversion,
          CASE 
            WHEN COUNT(CASE WHEN c.estado = 'efectiva' THEN 1 END) > 0 
            THEN ROUND(SUM(CASE WHEN c.estado = 'efectiva' THEN c.total END) / COUNT(CASE WHEN c.estado = 'efectiva' THEN 1 END), 2)
            ELSE 0 
          END as ticketPromedio
        FROM usuarios u
        LEFT JOIN cotizaciones c ON u.usuarios_id = c.usuarios_id AND ${whereConditions}
        WHERE u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
          ${vendedorFilter}
        GROUP BY u.usuarios_id, u.nombre_completo, u.tipo_usuario
        ORDER BY ingresos DESC
      `);

      // Calcular totales
      const totales = {
        cotizaciones: rendimientoVendedores.reduce((sum, v) => sum + parseInt(v.cotizaciones), 0),
        efectivas: rendimientoVendedores.reduce((sum, v) => sum + parseInt(v.efectivas), 0),
        ingresos: rendimientoVendedores.reduce((sum, v) => sum + parseFloat(v.ingresos), 0),
        conversionPromedio: 0,
        ticketPromedio: 0
      };

      if (totales.cotizaciones > 0) {
        totales.conversionPromedio = ((totales.efectivas / totales.cotizaciones) * 100).toFixed(1);
      }

      if (totales.efectivas > 0) {
        totales.ticketPromedio = (totales.ingresos / totales.efectivas).toFixed(2);
      }

      return {
        rendimientoVendedores: rendimientoVendedores.map(v => ({
          nombre: v.nombre_completo,
          rol: this.formatearTipoUsuario(v.tipo_usuario),
          cotizaciones: parseInt(v.cotizaciones),
          efectivas: parseInt(v.efectivas),
          conversion: parseFloat(v.conversion),
          ingresos: parseFloat(v.ingresos),
          ticketPromedio: parseFloat(v.ticketPromedio)
        })),
        totales: {
          cotizaciones: totales.cotizaciones,
          efectivas: totales.efectivas,
          conversionPromedio: parseFloat(totales.conversionPromedio),
          ingresos: totales.ingresos,
          ticketPromedio: parseFloat(totales.ticketPromedio)
        },
        filtros: filtros,
        periodo: fechas
      };
    } catch (error) {
      console.error('Error en generarReporteVendedores:', error);
      throw new Error('Error al generar reporte de vendedores');
    }
  }

// Reporte de Servicios CORREGIDO
async generarReporteServicios(filtros) {
  try {
    const fechas = this.procesarFiltrosFecha(filtros);
    
    let whereConditions = `c.created_at BETWEEN '${fechas.inicio}' AND '${fechas.fin}'`;
    let categoriaFilter = '';
    let servicioFilter = '';
    
    if (filtros.categoria && filtros.categoria !== '' && !isNaN(parseInt(filtros.categoria))) {
      categoriaFilter = `AND cat.categorias_id = ${parseInt(filtros.categoria)}`;
    }

    // NUEVO: Filtro por servicio específico
    if (filtros.servicio && filtros.servicio !== '' && !isNaN(parseInt(filtros.servicio))) {
      servicioFilter = `AND s.servicios_id = ${parseInt(filtros.servicio)}`;
    }

    // Query para servicios individuales
    const [serviciosIndividuales] = await sequelize.query(`
      SELECT 
        s.servicios_id,
        s.nombre,
        cat.nombre as categoria,
        COUNT(cd.detalles_id) as cotizaciones,
        COUNT(CASE WHEN c.estado = 'efectiva' THEN cd.detalles_id END) as efectivas,
        COALESCE(SUM(CASE WHEN c.estado = 'efectiva' THEN cd.subtotal END), 0) as ingresos,
        CASE 
          WHEN COUNT(CASE WHEN c.estado = 'efectiva' THEN cd.detalles_id END) > 0 
          THEN ROUND(AVG(CASE WHEN c.estado = 'efectiva' THEN cd.precio_usado END), 2)
          ELSE 0 
        END as precioPromedio
      FROM servicios s
      LEFT JOIN categorias cat ON s.categorias_id = cat.categorias_id
      LEFT JOIN cotizacion_detalles cd ON s.servicios_id = cd.servicios_id
      LEFT JOIN cotizaciones c ON cd.cotizaciones_id = c.cotizaciones_id AND ${whereConditions}
      LEFT JOIN usuarios u ON c.usuarios_id = u.usuarios_id 
        AND u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario') 
        AND u.estado = 'activo'
      WHERE s.estado = 'activo'
        ${categoriaFilter}
        ${servicioFilter}
      GROUP BY s.servicios_id, s.nombre, cat.nombre
      HAVING COUNT(cd.detalles_id) > 0
      ORDER BY s.nombre
    `);

    // DECISIÓN: ¿Agrupar o mostrar individual?
    let rendimientoServicios;
    
    if (filtros.servicio && filtros.servicio !== '' && !isNaN(parseInt(filtros.servicio))) {
      // CASO 1: Servicio específico seleccionado -> Mostrar todas las variantes del mismo grupo
      
      // Obtener el servicio seleccionado para determinar su grupo
      const servicioSeleccionado = await sequelize.query(`
        SELECT nombre FROM servicios WHERE servicios_id = ${parseInt(filtros.servicio)}
      `);
      
      if (servicioSeleccionado[0].length === 0) {
        throw new Error('Servicio no encontrado');
      }
      
      const nombreServicioSeleccionado = servicioSeleccionado[0][0].nombre;
      const grupoBase = this.extraerNombreBase(nombreServicioSeleccionado);
      
      // Obtener TODAS las variantes del mismo grupo (sin filtro de servicio específico)
      const [todasLasVariantes] = await sequelize.query(`
        SELECT 
          s.servicios_id,
          s.nombre,
          cat.nombre as categoria,
          COUNT(cd.detalles_id) as cotizaciones,
          COUNT(CASE WHEN c.estado = 'efectiva' THEN cd.detalles_id END) as efectivas,
          COALESCE(SUM(CASE WHEN c.estado = 'efectiva' THEN cd.subtotal END), 0) as ingresos,
          CASE 
            WHEN COUNT(CASE WHEN c.estado = 'efectiva' THEN cd.detalles_id END) > 0 
            THEN ROUND(AVG(CASE WHEN c.estado = 'efectiva' THEN cd.precio_usado END), 2)
            ELSE 0 
          END as precioPromedio
        FROM servicios s
        LEFT JOIN categorias cat ON s.categorias_id = cat.categorias_id
        LEFT JOIN cotizacion_detalles cd ON s.servicios_id = cd.servicios_id
        LEFT JOIN cotizaciones c ON cd.cotizaciones_id = c.cotizaciones_id AND ${whereConditions}
        LEFT JOIN usuarios u ON c.usuarios_id = u.usuarios_id 
          AND u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario') 
          AND u.estado = 'activo'
        WHERE s.estado = 'activo'
          ${categoriaFilter}
        GROUP BY s.servicios_id, s.nombre, cat.nombre
        ORDER BY s.nombre
      `);
      
      // Filtrar solo las variantes del mismo grupo
      const variantesDelGrupo = todasLasVariantes.filter(servicio => {
        const nombreBase = this.extraerNombreBase(servicio.nombre);
        return nombreBase === grupoBase;
      });
      
      // Convertir directamente a formato individual (sin agrupar)
      rendimientoServicios = variantesDelGrupo.map(servicio => {
        const cotizaciones = parseInt(servicio.cotizaciones);
        const efectivas = parseInt(servicio.efectivas);
        const conversion = cotizaciones > 0 ? ((efectivas / cotizaciones) * 100).toFixed(1) : 0;
        
        return {
          nombre: servicio.nombre, // Nombre completo individual
          categoria: servicio.categoria || 'Sin categoría',
          cotizaciones: cotizaciones,
          efectivas: efectivas,
          conversion: parseFloat(conversion),
          ingresos: parseFloat(servicio.ingresos),
          precioPromedio: parseFloat(servicio.precioPromedio),
          cantidadVariantes: 1, // Cada fila es una variante individual
          esVarianteIndividual: true // Flag para el frontend
        };
      });
      
    } else {
      // CASO 2: Sin servicio específico -> Agrupar como antes
      
      const serviciosAgrupados = {};
      
      serviciosIndividuales.forEach(servicio => {
        const nombreBase = this.extraerNombreBase(servicio.nombre);
        
        if (!serviciosAgrupados[nombreBase]) {
          serviciosAgrupados[nombreBase] = {
            nombre: nombreBase,
            categoria: servicio.categoria || 'Sin categoría',
            cotizaciones: 0,
            efectivas: 0,
            ingresos: 0,
            preciosIndividuales: [],
            cantidadVariantes: 0,
            variantes: []
          };
        }
        
        const grupo = serviciosAgrupados[nombreBase];
        grupo.cotizaciones += parseInt(servicio.cotizaciones);
        grupo.efectivas += parseInt(servicio.efectivas);
        grupo.ingresos += parseFloat(servicio.ingresos);
        grupo.cantidadVariantes += 1;
        
        // Para calcular precio promedio ponderado
        if (parseFloat(servicio.precioPromedio) > 0) {
          grupo.preciosIndividuales.push({
            precio: parseFloat(servicio.precioPromedio),
            peso: parseInt(servicio.efectivas)
          });
        }
        
        grupo.variantes.push({
          nombre: servicio.nombre,
          cotizaciones: parseInt(servicio.cotizaciones),
          efectivas: parseInt(servicio.efectivas),
          ingresos: parseFloat(servicio.ingresos)
        });
      });

      // Calcular métricas finales para grupos
      rendimientoServicios = Object.values(serviciosAgrupados).map(grupo => {
        // Calcular conversión
        const conversion = grupo.cotizaciones > 0 ? 
          ((grupo.efectivas / grupo.cotizaciones) * 100).toFixed(1) : 0;
        
        // Calcular precio promedio ponderado
        let precioPromedio = 0;
        if (grupo.preciosIndividuales.length > 0) {
          const sumaPrecios = grupo.preciosIndividuales.reduce((sum, item) => 
            sum + (item.precio * item.peso), 0);
          const sumaPesos = grupo.preciosIndividuales.reduce((sum, item) => 
            sum + item.peso, 0);
          precioPromedio = sumaPesos > 0 ? (sumaPrecios / sumaPesos).toFixed(2) : 0;
        }
        
        return {
          nombre: grupo.nombre,
          categoria: grupo.categoria,
          cotizaciones: grupo.cotizaciones,
          efectivas: grupo.efectivas,
          conversion: parseFloat(conversion),
          ingresos: grupo.ingresos,
          precioPromedio: parseFloat(precioPromedio),
          cantidadVariantes: grupo.cantidadVariantes,
          variantes: grupo.variantes,
          esVarianteIndividual: false // Flag para el frontend
        };
      });
    }

    // Ordenar por ingresos descendente
    rendimientoServicios.sort((a, b) => b.ingresos - a.ingresos);

    return {
      rendimientoServicios: rendimientoServicios,
      filtros: filtros,
      periodo: fechas
    };
  } catch (error) {
    console.error('Error en generarReporteServicios:', error);
    throw new Error('Error al generar reporte de servicios');
  }
}
  // Reporte de Clientes
  async generarReporteClientes(filtros) {
    try {
      const fechas = this.procesarFiltrosFecha(filtros);
      
      let whereConditions = `c.created_at BETWEEN '${fechas.inicio}' AND '${fechas.fin}'`;
      let clienteFilter = '';
      let vendedorFilter = '';
      
      if (filtros.cliente && filtros.cliente !== '' && filtros.cliente !== null && !isNaN(parseInt(filtros.cliente))) {
        clienteFilter = `AND cl.clientes_id = ${parseInt(filtros.cliente)}`;
      }
      
      if (filtros.vendedor && filtros.vendedor !== '' && filtros.vendedor !== null && !isNaN(parseInt(filtros.vendedor))) {
        vendedorFilter = `AND u.usuarios_id = ${parseInt(filtros.vendedor)}`;
      }

      const [actividadClientes] = await sequelize.query(`
        SELECT 
          cl.clientes_id,
          cl.nombre_encargado,
          cl.nombre_empresa,
          u.nombre_completo as vendedorAsignado,
          COUNT(c.cotizaciones_id) as totalCotizaciones,
          MAX(c.created_at) as ultimaCotizacion,
          COALESCE(SUM(CASE WHEN c.estado = 'efectiva' THEN c.total END), 0) as totalFacturado,
          COUNT(CASE WHEN c.estado = 'efectiva' THEN 1 END) as cotizacionesEfectivas,
          COUNT(CASE WHEN c.estado = 'pendiente' THEN 1 END) as cotizacionesPendientes
        FROM clientes cl
        LEFT JOIN cotizaciones c ON cl.clientes_id = c.clientes_id AND ${whereConditions}
        LEFT JOIN usuarios u ON cl.usuarios_id = u.usuarios_id
        WHERE u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
          ${clienteFilter}
          ${vendedorFilter}
        GROUP BY cl.clientes_id, cl.nombre_encargado, cl.nombre_empresa, u.nombre_completo
        HAVING COUNT(c.cotizaciones_id) > 0
        ORDER BY totalFacturado DESC
      `);

      return {
        actividadClientes: actividadClientes.map(c => ({
          id: c.clientes_id,
          nombreEncargado: c.nombre_encargado,
          empresa: c.nombre_empresa,
          vendedorAsignado: c.vendedorAsignado,
          totalCotizaciones: parseInt(c.totalCotizaciones),
          ultimaCotizacion: c.ultimaCotizacion,
          totalFacturado: parseFloat(c.totalFacturado),
          cotizacionesEfectivas: parseInt(c.cotizacionesEfectivas),
          cotizacionesPendientes: parseInt(c.cotizacionesPendientes)
        })),
        filtros: filtros,
        periodo: fechas
      };
    } catch (error) {
      console.error('Error en generarReporteClientes:', error);
      throw new Error('Error al generar reporte de clientes');
    }
  }

  // Reporte Financiero
  async generarReporteFinanciero(filtros) {
    try {
      const fechas = this.procesarFiltrosFecha(filtros);
      
      // Ingresos totales del período
      const [resumenFinanciero] = await sequelize.query(`
        SELECT 
          COALESCE(SUM(c.total), 0) as ingresosBrutos,
          COUNT(c.cotizaciones_id) as totalCotizaciones,
          COUNT(CASE WHEN c.estado = 'efectiva' THEN 1 END) as cotizacionesEfectivas
        FROM cotizaciones c
        INNER JOIN usuarios u ON c.usuarios_id = u.usuarios_id
        WHERE c.estado = 'efectiva'
          AND c.created_at BETWEEN '${fechas.inicio}' AND '${fechas.fin}'
          AND u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
      `);

      // Detalles mensuales
      const [detallesMensuales] = await sequelize.query(`
        SELECT 
          DATE_FORMAT(c.created_at, '%Y-%m') as mes,
          COUNT(c.cotizaciones_id) as cotizaciones,
          COUNT(CASE WHEN c.estado = 'efectiva' THEN 1 END) as efectivas,
          COALESCE(SUM(CASE WHEN c.estado = 'efectiva' THEN c.total END), 0) as ingresos
        FROM cotizaciones c
        INNER JOIN usuarios u ON c.usuarios_id = u.usuarios_id
        WHERE c.created_at BETWEEN '${fechas.inicio}' AND '${fechas.fin}'
          AND u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
        GROUP BY DATE_FORMAT(c.created_at, '%Y-%m')
        ORDER BY mes DESC
      `);

      // Calcular métricas
      const ingresosBrutos = parseFloat(resumenFinanciero[0].ingresosBrutos);
      const mesesConDatos = detallesMensuales.length;
      const promedioMensual = mesesConDatos > 0 ? ingresosBrutos / mesesConDatos : 0;

      // Encontrar mejor mes
      let mejorMes = 'Sin datos';
      if (detallesMensuales.length > 0) {
        const mesConMayorIngreso = detallesMensuales.reduce((max, current) => 
          parseFloat(current.ingresos) > parseFloat(max.ingresos) ? current : max
        );
        mejorMes = this.formatearMes(mesConMayorIngreso.mes);
      }

      // Calcular crecimiento (comparar último mes con penúltimo)
      let crecimiento = 0;
      if (detallesMensuales.length >= 2) {
        const ultimoMes = parseFloat(detallesMensuales[0].ingresos);
        const penultimoMes = parseFloat(detallesMensuales[1].ingresos);
        if (penultimoMes > 0) {
          crecimiento = ((ultimoMes - penultimoMes) / penultimoMes * 100).toFixed(1);
        }
      }

      return {
        financiero: {
          ingresosBrutos: ingresosBrutos,
          promedioMensual: promedioMensual,
          mejorMes: mejorMes,
          crecimiento: parseFloat(crecimiento),
          detallesMensuales: detallesMensuales.map((mes, index) => {
            // Calcular crecimiento mes a mes
            let crecimientoMes = 0;
            if (index < detallesMensuales.length - 1) {
              const mesActual = parseFloat(mes.ingresos);
              const mesAnterior = parseFloat(detallesMensuales[index + 1].ingresos);
              if (mesAnterior > 0) {
                crecimientoMes = ((mesActual - mesAnterior) / mesAnterior * 100).toFixed(1);
              }
            }
            
            return {
              mes: this.formatearMes(mes.mes),
              cotizaciones: parseInt(mes.cotizaciones),
              efectivas: parseInt(mes.efectivas),
              ingresos: parseFloat(mes.ingresos),
              crecimiento: parseFloat(crecimientoMes)
            };
          })
        },
        filtros: filtros,
        periodo: fechas
      };
    } catch (error) {
      console.error('Error en generarReporteFinanciero:', error);
      throw new Error('Error al generar reporte financiero');
    }
  }

  // Exportar reporte (placeholder para futura implementación)
  async exportarReporte(tipo, formato, filtros, datos) {
    try {
      // Por ahora solo retornamos la estructura
      // En el futuro se puede implementar generación de PDF server-side
      return {
        tipo: tipo,
        formato: formato,
        archivo: `reporte-${tipo}-${new Date().toISOString().split('T')[0]}.${formato}`,
        url: '#', // URL temporal
        fechaGeneracion: new Date(),
        mensaje: 'Exportación desde el frontend implementada'
      };
    } catch (error) {
      console.error('Error en exportarReporte:', error);
      throw new Error('Error al exportar reporte');
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  // Procesar filtros de fecha
  procesarFiltrosFecha(filtros) {
    const hoy = new Date();
    let fechaInicio, fechaFin;

    if (filtros.periodo === 'custom' && filtros.fechaInicio && filtros.fechaFin) {
      fechaInicio = new Date(filtros.fechaInicio);
      fechaFin = new Date(filtros.fechaFin + ' 23:59:59');
    } else {
      const dias = parseInt(filtros.periodo) || 30;
      fechaInicio = new Date(hoy.getTime() - (dias * 24 * 60 * 60 * 1000));
      fechaFin = new Date(hoy.getTime());
    }

    return {
      inicio: fechaInicio.toISOString().slice(0, 19).replace('T', ' '),
      fin: fechaFin.toISOString().slice(0, 19).replace('T', ' '),
      inicioOriginal: fechaInicio,
      finOriginal: fechaFin
    };
  }

  // Formatear tipo de usuario
  formatearTipoUsuario(tipo) {
    const tipos = {
      'admin': 'Admin',
      'vendedor': 'Vendedor',
      'super_usuario': 'Supervisor'
    };
    return tipos[tipo] || tipo;
  }

  // Formatear mes (YYYY-MM a nombre legible)
  formatearMes(mesString) {
    try {
      const [año, mes] = mesString.split('-');
      const fecha = new Date(parseInt(año), parseInt(mes) - 1);
      return fecha.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long' 
      });
    } catch (error) {
      return mesString;
    }
  }

  // FUNCIÓN CORREGIDA: Extraer nombre base de servicios
  extraerNombreBase(nombreCompleto) {
    const nombre = nombreCompleto.trim().toUpperCase();
    
    // Mapeo directo de patrones
    if (nombre.startsWith('LIGNASHIELD COMPLETE')) return 'LIGNASHIELD COMPLETE';
    if (nombre.startsWith('LIGNAFLEX RMM GESTIONADO')) return 'LIGNAFLEX RMM GESTIONADO';
   if (nombre.startsWith('LIGNAFLEX ANTIMALWARE GESTIONADO')) return 'LIGNAFLEX ANTIMALWARE GESTIONADO';
   if (nombre.startsWith('LIGNAFLEX RMM SIN GESTIÓN')) return 'LIGNAFLEX RMM SIN GESTIÓN';
   if (nombre.startsWith('LIGNAFLEX ANTIMALWARE SIN GESTIÓN')) return 'LIGNAFLEX ANTIMALWARE SIN GESTIÓN';
   
   // LIGNA VAULT variantes
   if (nombre.startsWith('LIGNA VAULT BASICO POR CT')) return 'LIGNA VAULT Basico por CT';
   if (nombre.startsWith('LIGNA VAULT BASICO POR SRV')) return 'LIGNA VAULT Basico por SRV';
   if (nombre.startsWith('LIGNA VAULT BASICO POR VM')) return 'LIGNA VAULT Basico por VM';
   if (nombre.startsWith('LIGNA VAULT BASICO POR GB')) return 'LIGNA VAULT Basico por GB';
   
   if (nombre.startsWith('LIGNA VAULT AVANZADO POR ET')) return 'LIGNA VAULT Avanzado por ET';
   if (nombre.startsWith('LIGNA VAULT AVANZADO POR SRV')) return 'LIGNA VAULT Avanzado por SRV';
   if (nombre.startsWith('LIGNA VAULT AVANZADO POR VM')) return 'LIGNA VAULT Avanzado por VM';
   
   if (nombre.startsWith('LIGNA VAULT DR SRV')) return 'LIGNA VAULT DR SRV';
   if (nombre.startsWith('LIGNA VAULT ACRONIS CLOUD STORAGE')) return 'Ligna Vault Acronis Cloud Storage';
   if (nombre.startsWith('LIGNA VAULT PAQUETE BACKUP')) return 'Ligna Vault Paquete Backup';
   
   // Casos especiales para nombres que empiezan diferente
   if (nombre.includes('LIGNA VAULT') && nombre.includes('GIGABYTE')) return 'Ligna Vault - Gigabyte';
   
   // Fallback - devolver el original limpio
   return nombreCompleto.replace(/ \d+ - \d+.*$/g, '').replace(/ \+\d+.*$/g, '').trim();
 }

 // Validar filtros
 validarFiltros(filtros) {
   const errores = [];

   if (filtros.periodo === 'custom') {
     if (!filtros.fechaInicio) {
       errores.push('Fecha de inicio es requerida para período personalizado');
     }
     if (!filtros.fechaFin) {
       errores.push('Fecha de fin es requerida para período personalizado');
     }
     if (filtros.fechaInicio && filtros.fechaFin) {
       const inicio = new Date(filtros.fechaInicio);
       const fin = new Date(filtros.fechaFin);
       if (inicio > fin) {
         errores.push('La fecha de inicio debe ser anterior a la fecha de fin');
       }
     }
   }

   if (errores.length > 0) {
     throw new Error(errores.join(', '));
   }

   return true;
 }
}

module.exports = new ReportesService();