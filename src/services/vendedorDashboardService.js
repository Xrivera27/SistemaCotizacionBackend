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

class VendedorDashboardService {

  // Obtener estadísticas del vendedor específico
  async getVendedorStats(usuarioId) {
    try {
      // Estadísticas de cotizaciones del vendedor
      const [estadisticas] = await sequelize.query(`
        SELECT 
          estado,
          COUNT(*) as cantidad
        FROM cotizaciones 
        WHERE usuarios_id = :usuarioId
        GROUP BY estado
      `, {
        replacements: { usuarioId }
      });

      // Convertir a objeto
      const stats = {
        pendientes: 0,
        esperandoAprobacion: 0,
        efectivas: 0,
        canceladas: 0
      };

      // Mapear estados
      const estadoMap = {
        'pendiente': 'pendientes',
        'pendiente_aprobacion': 'esperandoAprobacion',
        'efectiva': 'efectivas',
        'rechazada': 'canceladas'
      };

      estadisticas.forEach(stat => {
        const estadoFrontend = estadoMap[stat.estado];
        if (estadoFrontend) {
          stats[estadoFrontend] = parseInt(stat.cantidad);
        }
      });

      return stats;
    } catch (error) {
      console.error('Error en getVendedorStats:', error);
      throw new Error('Error al obtener estadísticas del vendedor');
    }
  }

  // Obtener datos para gráfico de ventas efectivas vs rechazadas por días
  async getVentasChart(usuarioId, dias = 7) {
    try {
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - (dias - 1));
      fechaInicio.setHours(0, 0, 0, 0);

      const fechaFin = new Date();
      fechaFin.setHours(23, 59, 59, 999);

      const [results] = await sequelize.query(`
        SELECT 
          DATE(c.fecha_creacion) as fecha,
          COUNT(CASE WHEN c.estado = 'efectiva' THEN 1 END) as efectivas,
          COUNT(CASE WHEN c.estado = 'rechazada' THEN 1 END) as rechazadas
        FROM cotizaciones c
        WHERE c.usuarios_id = :usuarioId
          AND c.fecha_creacion BETWEEN :fechaInicio AND :fechaFin
        GROUP BY DATE(c.fecha_creacion)
        ORDER BY DATE(c.fecha_creacion) ASC
      `, {
        replacements: {
          usuarioId,
          fechaInicio: fechaInicio.toISOString(),
          fechaFin: fechaFin.toISOString()
        }
      });

      // Generar labels para todos los días
      const labels = [];
      const efectivasData = [];
      const rechazadasData = [];

      for (let i = 0; i < dias; i++) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - (dias - 1 - i));
        
        const fechaStr = fecha.toISOString().split('T')[0];
        const label = fecha.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
        
        labels.push(label);
        
        // Buscar datos para esta fecha
        const dataForDate = results.find(r => r.fecha === fechaStr);
        efectivasData.push(dataForDate ? parseInt(dataForDate.efectivas) : 0);
        rechazadasData.push(dataForDate ? parseInt(dataForDate.rechazadas) : 0);
      }

      return {
        labels,
        datasets: [
          {
            label: 'Ventas Efectivas',
            data: efectivasData,
            borderColor: '#27ae60',
            backgroundColor: 'rgba(39, 174, 96, 0.1)'
          },
          {
            label: 'Ventas Rechazadas',
            data: rechazadasData,
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)'
          }
        ]
      };
    } catch (error) {
      console.error('Error en getVentasChart:', error);
      throw new Error('Error al obtener datos del gráfico de ventas');
    }
  }

  // Obtener datos para gráfico de distribución de estados
  async getEstadosChart(usuarioId) {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          estado,
          COUNT(*) as cantidad
        FROM cotizaciones 
        WHERE usuarios_id = :usuarioId
        GROUP BY estado
      `, {
        replacements: { usuarioId }
      });

      const labels = [];
      const data = [];
      const colors = [];

      const estadoConfig = {
        'pendiente': { label: 'Pendientes', color: '#f39c12' },
        'pendiente_aprobacion': { label: 'Esperando Aprobación', color: '#e67e22' },
        'efectiva': { label: 'Efectivas', color: '#27ae60' },
        'rechazada': { label: 'Canceladas', color: '#e74c3c' }
      };

      results.forEach(result => {
        const config = estadoConfig[result.estado];
        if (config) {
          labels.push(config.label);
          data.push(parseInt(result.cantidad));
          colors.push(config.color);
        }
      });

      return {
        labels,
        data,
        colors
      };
    } catch (error) {
      console.error('Error en getEstadosChart:', error);
      throw new Error('Error al obtener datos del gráfico de estados');
    }
  }

  // Obtener resumen de ventas por período
  async getResumenVentas(usuarioId, periodo = 'mes') {
    try {
      const fechas = this.getFechasPorPeriodo(periodo);
      
      // Ventas totales del período
      const [ventasResult] = await sequelize.query(`
        SELECT 
          COALESCE(SUM(c.total), 0) as totalVentas,
          COUNT(*) as cotizacionesAprobadas
        FROM cotizaciones c
        WHERE c.usuarios_id = :usuarioId
          AND c.estado = 'efectiva' 
          AND c.fecha_creacion BETWEEN :fechaInicio AND :fechaFin
      `, {
        replacements: {
          usuarioId,
          fechaInicio: fechas.inicio,
          fechaFin: fechas.fin
        }
      });

      const totalVentas = parseFloat(ventasResult[0]?.totalVentas || 0);
      const cotizacionesAprobadas = parseInt(ventasResult[0]?.cotizacionesAprobadas || 0);

      return {
        totalVentas,
        cotizacionesAprobadas,
        periodo,
        fechas: {
          inicio: fechas.inicio,
          fin: fechas.fin
        }
      };
    } catch (error) {
      console.error('Error en getResumenVentas:', error);
      throw new Error('Error al obtener resumen de ventas');
    }
  }

  // Obtener cotizaciones recientes del vendedor
  async getCotizacionesRecientes(usuarioId, limit = 5) {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          c.cotizaciones_id,
          c.total,
          c.estado,
          c.created_at,
          cl.nombre_empresa
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.clientes_id = cl.clientes_id
        WHERE c.usuarios_id = :usuarioId
        ORDER BY c.created_at DESC
        LIMIT :limit
      `, {
        replacements: { usuarioId, limit }
      });

      return results.map(cotizacion => ({
        id: cotizacion.cotizaciones_id,
        codigo: `CT${String(cotizacion.cotizaciones_id).padStart(6, '0')}`,
        cliente: cotizacion.nombre_empresa || 'Cliente no especificado',
        monto: parseFloat(cotizacion.total),
        fechaCreacion: cotizacion.created_at,
        estado: this.mapearEstadoParaFrontend(cotizacion.estado)
      }));
    } catch (error) {
      console.error('Error en getCotizacionesRecientes:', error);
      throw new Error('Error al obtener cotizaciones recientes');
    }
  }

  // Métodos auxiliares
  getFechasPorPeriodo(periodo) {
    const hoy = new Date();
    let inicio, fin;

    switch (periodo) {
      case 'semana':
        // Última semana (7 días)
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - 6);
        inicio.setHours(0, 0, 0, 0);
        fin = new Date(hoy);
        fin.setHours(23, 59, 59, 999);
        break;
        
      case 'quincena':
        // Últimos 15 días
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - 14);
        inicio.setHours(0, 0, 0, 0);
        fin = new Date(hoy);
        fin.setHours(23, 59, 59, 999);
        break;
        
      default: // 'mes'
        // Mes actual
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    }

    return { inicio, fin };
  }

  mapearEstadoParaFrontend(estadoBD) {
    const mapeo = {
      'pendiente': 'pendiente',
      'pendiente_aprobacion': 'esperando',
      'efectiva': 'efectiva',
      'rechazada': 'cancelada'
    };
    return mapeo[estadoBD] || estadoBD;
  }
}

module.exports = new VendedorDashboardService();