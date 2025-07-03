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

class DashboardService {

  // Obtener estadísticas generales para admin
  async getAdminStats() {
    try {
      // Usar SQL directo para evitar problemas de alias
      const [estadisticas] = await sequelize.query(`
        SELECT 
          estado,
          COUNT(*) as cantidad
        FROM cotizaciones 
        GROUP BY estado
      `);

      // Contar TODOS los colaboradores activos (los 3 roles)
      const [colaboradores] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM usuarios 
        WHERE tipo_usuario IN ('admin', 'vendedor', 'super_usuario') 
          AND estado = 'activo'
      `);

      // Convertir a objeto
      const stats = {
        pendientes: 0,
        esperandoAprobacion: 0,
        efectivas: 0,
        canceladas: 0,
        colaboradoresActivos: colaboradores[0]?.total || 0
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
      console.error('Error en getAdminStats:', error);
      throw new Error('Error al obtener estadísticas generales');
    }
  }

  // Obtener datos para gráfico de colaboradores
  async getColaboradoresChart() {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          u.nombre_completo,
          u.tipo_usuario,
          COUNT(c.cotizaciones_id) as cotizacionesEfectivas
        FROM cotizaciones c
        INNER JOIN usuarios u ON c.usuarios_id = u.usuarios_id
        WHERE c.estado = 'efectiva' 
          AND u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
        GROUP BY u.usuarios_id, u.nombre_completo, u.tipo_usuario
        ORDER BY COUNT(c.cotizaciones_id) DESC
        LIMIT 8
      `);

      const labels = results.map(item => {
        const nombreCompleto = item.nombre_completo;
        const tipoUsuario = item.tipo_usuario;
        
        // Abreviar nombre para el gráfico y agregar rol
        const partes = nombreCompleto.split(' ');
        const nombreCorto = partes.length > 1 
          ? `${partes[0]} ${partes[1].charAt(0)}.`
          : partes[0];
          
        // Agregar indicador de rol
        const roleIndicator = {
          'admin': '(A)',
          'vendedor': '(V)', 
          'super_usuario': '(S)'
        };
        
        return `${nombreCorto} ${roleIndicator[tipoUsuario] || ''}`;
      });

      const data = results.map(item => parseInt(item.cotizacionesEfectivas));

      return {
        labels,
        data,
        totalColaboradores: labels.length
      };
    } catch (error) {
      console.error('Error en getColaboradoresChart:', error);
      throw new Error('Error al obtener datos del gráfico de colaboradores');
    }
  }

  // Obtener datos para gráfico de servicios más cotizados
  async getServiciosChart() {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          s.nombre as servicio_nombre,
          COUNT(cd.detalles_id) as vecesCotizado
        FROM cotizacion_detalles cd
        INNER JOIN servicios s ON cd.servicios_id = s.servicios_id
        INNER JOIN cotizaciones c ON cd.cotizaciones_id = c.cotizaciones_id
        INNER JOIN usuarios u ON c.usuarios_id = u.usuarios_id
        WHERE c.estado IN ('efectiva', 'pendiente', 'pendiente_aprobacion')
          AND u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
        GROUP BY s.servicios_id, s.nombre
        ORDER BY COUNT(cd.detalles_id) DESC
        LIMIT 6
      `);

      const labels = results.map(item => item.servicio_nombre);
      const data = results.map(item => parseInt(item.vecesCotizado));

      return {
        labels,
        data,
        totalServicios: labels.length
      };
    } catch (error) {
      console.error('Error en getServiciosChart:', error);
      throw new Error('Error al obtener datos del gráfico de servicios');
    }
  }

  // Obtener resumen mensual de ventas
  async getResumenMensual(mes = 'actual') {
    try {
      const fechas = this.getFechasPorMes(mes);
      
      // Ventas totales del mes (de todos los roles)
      const [ventasResult] = await sequelize.query(`
        SELECT COALESCE(SUM(c.total), 0) as ventasTotales
        FROM cotizaciones c
        INNER JOIN usuarios u ON c.usuarios_id = u.usuarios_id
        WHERE c.estado = 'efectiva' 
          AND c.fecha_creacion BETWEEN :fechaInicio AND :fechaFin
          AND u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
      `, {
        replacements: {
          fechaInicio: fechas.inicio,
          fechaFin: fechas.fin
        }
      });

      // Mejor vendedor del mes (incluye todos los roles)
      const [mejorVendedorResult] = await sequelize.query(`
        SELECT 
          u.nombre_completo,
          u.tipo_usuario,
          SUM(c.total) as totalVentas
        FROM cotizaciones c
        INNER JOIN usuarios u ON c.usuarios_id = u.usuarios_id
        WHERE c.estado = 'efectiva' 
          AND c.fecha_creacion BETWEEN :fechaInicio AND :fechaFin
          AND u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
        GROUP BY u.usuarios_id, u.nombre_completo, u.tipo_usuario
        ORDER BY SUM(c.total) DESC
        LIMIT 1
      `, {
        replacements: {
          fechaInicio: fechas.inicio,
          fechaFin: fechas.fin
        }
      });

      // Formatear nombre del mejor vendedor con su rol
      let mejorVendedorNombre = 'Sin datos';
      if (mejorVendedorResult[0]) {
        const roleNames = {
          'admin': 'Admin',
          'vendedor': 'Vendedor',
          'super_usuario': 'Supervisor'
        };
        const roleName = roleNames[mejorVendedorResult[0].tipo_usuario] || '';
        mejorVendedorNombre = `${mejorVendedorResult[0].nombre_completo} (${roleName})`;
      }

      return {
        ventasTotales: parseFloat(ventasResult[0]?.ventasTotales || 0),
        mejorVendedor: {
          nombre: mejorVendedorNombre,
          ventas: parseFloat(mejorVendedorResult[0]?.totalVentas || 0)
        },
        mes: mes,
        periodo: {
          inicio: fechas.inicio,
          fin: fechas.fin
        }
      };
    } catch (error) {
      console.error('Error en getResumenMensual:', error);
      throw new Error('Error al obtener resumen mensual');
    }
  }

  // Obtener cotizaciones recientes (de todos los roles)
  async getCotizacionesRecientes(limit = 8) {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          c.cotizaciones_id,
          c.total,
          c.estado,
          c.created_at,
          cl.nombre_empresa,
          u.nombre_completo as vendedor_nombre,
          u.tipo_usuario
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.clientes_id = cl.clientes_id
        LEFT JOIN usuarios u ON c.usuarios_id = u.usuarios_id
        WHERE u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
        ORDER BY c.created_at DESC
        LIMIT :limit
      `, {
        replacements: { limit }
      });

      return results.map(cotizacion => {
        // Formatear nombre del vendedor con su rol
        let vendedorNombre = 'Usuario no especificado';
        if (cotizacion.vendedor_nombre) {
          const roleIndicators = {
            'admin': '(Admin)',
            'vendedor': '(Vendedor)',
            'super_usuario': '(Supervisor)'
          };
          const roleIndicator = roleIndicators[cotizacion.tipo_usuario] || '';
          vendedorNombre = `${cotizacion.vendedor_nombre} ${roleIndicator}`;
        }

        return {
          id: cotizacion.cotizaciones_id,
          codigo: `COT-${new Date().getFullYear()}-${String(cotizacion.cotizaciones_id).padStart(3, '0')}`,
          cliente: cotizacion.nombre_empresa || 'Cliente no especificado',
          vendedor: vendedorNombre,
          monto: parseFloat(cotizacion.total),
          fechaCreacion: cotizacion.created_at,
          estado: this.mapearEstadoParaFrontend(cotizacion.estado)
        };
      });
    } catch (error) {
      console.error('Error en getCotizacionesRecientes:', error);
      throw new Error('Error al obtener cotizaciones recientes');
    }
  }

  // Obtener estadísticas adicionales por rol (método bonus)
  async getEstadisticasPorRol() {
    try {
      const [resultados] = await sequelize.query(`
        SELECT 
          u.tipo_usuario,
          COUNT(DISTINCT u.usuarios_id) as total_usuarios,
          COUNT(c.cotizaciones_id) as total_cotizaciones,
          COUNT(CASE WHEN c.estado = 'efectiva' THEN 1 END) as cotizaciones_efectivas,
          COALESCE(SUM(CASE WHEN c.estado = 'efectiva' THEN c.total END), 0) as ventas_totales
        FROM usuarios u
        LEFT JOIN cotizaciones c ON u.usuarios_id = c.usuarios_id
        WHERE u.tipo_usuario IN ('admin', 'vendedor', 'super_usuario')
          AND u.estado = 'activo'
        GROUP BY u.tipo_usuario
        ORDER BY ventas_totales DESC
      `);

      return resultados.map(item => ({
        rol: item.tipo_usuario,
        totalUsuarios: parseInt(item.total_usuarios),
        totalCotizaciones: parseInt(item.total_cotizaciones),
        cotizacionesEfectivas: parseInt(item.cotizaciones_efectivas),
        ventasTotales: parseFloat(item.ventas_totales),
        tasaConversion: item.total_cotizaciones > 0 
          ? ((item.cotizaciones_efectivas / item.total_cotizaciones) * 100).toFixed(1)
          : 0
      }));
    } catch (error) {
      console.error('Error en getEstadisticasPorRol:', error);
      throw new Error('Error al obtener estadísticas por rol');
    }
  }

  // Métodos auxiliares
  getFechasPorMes(mes) {
    const hoy = new Date();
    let inicio, fin;

    switch (mes) {
      case 'anterior':
        inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59);
        break;
      case 'hace2':
        inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
        fin = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 0, 23, 59, 59);
        break;
      default: // 'actual'
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

module.exports = new DashboardService();