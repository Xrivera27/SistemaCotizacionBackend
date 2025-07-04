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

class SuperDashboardService {

  // Obtener estadísticas específicas para super usuario
// Obtener estadísticas específicas para super usuario
async getSuperUsuarioStats() {
  try {
    // Estadísticas de cotizaciones
    const [estadisticas] = await sequelize.query(`
      SELECT 
        estado,
        COUNT(*) as cantidad
      FROM cotizaciones 
      GROUP BY estado
    `);

    // Contar TODOS los colaboradores activos (todos los roles)
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
      equipoActivo: colaboradores[0]?.total || 0
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
    console.error('Error en getSuperUsuarioStats:', error);
    throw new Error('Error al obtener estadísticas del supervisor');
  }
}
  // Obtener datos para gráfico efectivas vs canceladas (últimos N días)
  async getEfectivasVsCanceladas(dias = 30) {
    try {
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - dias);
      fechaInicio.setHours(0, 0, 0, 0);

      const [results] = await sequelize.query(`
        WITH fecha_series AS (
          SELECT DATE(CURDATE() - INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY) as fecha
          FROM (SELECT 0 as a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) as a
          CROSS JOIN (SELECT 0 as a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) as b
          CROSS JOIN (SELECT 0 as a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) as c
          WHERE DATE(CURDATE() - INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY) >= :fechaInicio
          ORDER BY fecha
        )
        SELECT 
          fs.fecha,
          COALESCE(efectivas.total, 0) as efectivas,
          COALESCE(canceladas.total, 0) as canceladas
        FROM fecha_series fs
        LEFT JOIN (
          SELECT DATE(fecha_creacion) as fecha, COUNT(*) as total
          FROM cotizaciones 
          WHERE estado = 'efectiva' 
            AND fecha_creacion >= :fechaInicio
          GROUP BY DATE(fecha_creacion)
        ) efectivas ON fs.fecha = efectivas.fecha
        LEFT JOIN (
          SELECT DATE(fecha_creacion) as fecha, COUNT(*) as total
          FROM cotizaciones 
          WHERE estado = 'rechazada' 
            AND fecha_creacion >= :fechaInicio
          GROUP BY DATE(fecha_creacion)
        ) canceladas ON fs.fecha = canceladas.fecha
        ORDER BY fs.fecha
      `, {
        replacements: { fechaInicio }
      });

      const labels = results.map(item => {
        const fecha = new Date(item.fecha);
        return fecha.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      });

      const efectivas = results.map(item => parseInt(item.efectivas));
      const canceladas = results.map(item => parseInt(item.canceladas));

      return {
        labels,
        efectivas,
        canceladas,
        totalDias: dias
      };
    } catch (error) {
      console.error('Error en getEfectivasVsCanceladas:', error);
      throw new Error('Error al obtener datos del gráfico comparativo');
    }
  }

// Obtener datos para gráfico de colaboradores (todos los roles)
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

    console.log('📊 Datos colaboradores chart:', results); // DEBUG

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

  // Obtener datos para gráfico de servicios más cotizados (igual que admin)
  async getServiciosChart() {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          s.nombre as servicio_nombre,
          COUNT(cd.detalles_id) as vecesCotizado
        FROM cotizacion_detalles cd
        INNER JOIN servicios s ON cd.servicios_id = s.servicios_id
        INNER JOIN cotizaciones c ON cd.cotizaciones_id = c.cotizaciones_id
        WHERE c.estado IN ('efectiva', 'pendiente', 'pendiente_aprobacion')
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

// Obtener resumen mensual específico para super usuario (incluye aprobaciones)
async getResumenMensual(mes = 'actual', superUsuarioId) {
 try {
   const fechas = this.getFechasPorMes(mes);
   
   // Ventas totales del mes
   const [ventasResult] = await sequelize.query(`
     SELECT COALESCE(SUM(c.total), 0) as ventasTotales
     FROM cotizaciones c
     WHERE c.estado = 'efectiva' 
       AND c.fecha_creacion BETWEEN :fechaInicio AND :fechaFin
   `, {
     replacements: {
       fechaInicio: fechas.inicio,
       fechaFin: fechas.fin
     }
   });

   // Aprobaciones realizadas por este super usuario
   const [aprobacionesResult] = await sequelize.query(`
     SELECT COUNT(*) as totalAprobaciones
     FROM cotizaciones 
     WHERE aprobado_por = :superUsuarioId
       AND fecha_aprobacion BETWEEN :fechaInicio AND :fechaFin
   `, {
     replacements: {
       superUsuarioId,
       fechaInicio: fechas.inicio,
       fechaFin: fechas.fin
     }
   });

   // Mejor vendedor del mes (TODOS los roles que pueden vender)
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
     HAVING SUM(c.total) > 0
     ORDER BY SUM(c.total) DESC
     LIMIT 1
   `, {
     replacements: {
       fechaInicio: fechas.inicio,
       fechaFin: fechas.fin
     }
   });

   console.log('📊 Datos mejor vendedor:', mejorVendedorResult); // DEBUG

   // Formatear nombre del mejor vendedor con su rol
   let mejorVendedorNombre = 'Sin ventas este mes';
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
     aprobacionesRealizadas: parseInt(aprobacionesResult[0]?.totalAprobaciones || 0),
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

  // Obtener cotizaciones pendientes de aprobación

// Obtener cotizaciones pendientes de aprobación
async getCotizacionesPendientesAprobacion() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        c.cotizaciones_id,
        c.total,
        c.created_at,
        c.comentario,
        cl.nombre_empresa,
        cl.nombre_encargado,
        u.nombre_completo as vendedor_nombre
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.clientes_id = cl.clientes_id
      LEFT JOIN usuarios u ON c.usuarios_id = u.usuarios_id
      WHERE c.estado = 'pendiente_aprobacion'
      ORDER BY c.created_at ASC
    `);

    return results.map(cotizacion => {
      // Determinar prioridad basada en el monto y tiempo
      const horasEspera = Math.floor((new Date() - new Date(cotizacion.created_at)) / (1000 * 60 * 60));
      let prioridad = 'baja';
      
      if (cotizacion.total > 150000 || horasEspera > 24) {
        prioridad = 'alta';
      } else if (cotizacion.total > 100000 || horasEspera > 12) {
        prioridad = 'media';
      }

      return {
        id: cotizacion.cotizaciones_id,
        codigo: `COT-${new Date().getFullYear()}-${String(cotizacion.cotizaciones_id).padStart(3, '0')}`,
        cliente: cotizacion.nombre_empresa || 'Cliente no especificado',
        vendedor: cotizacion.vendedor_nombre || 'Vendedor no especificado',
        monto: parseFloat(cotizacion.total),
        fechaCreacion: cotizacion.created_at,
        estado: 'esperando',
        prioridad,
        comentario: cotizacion.comentario
      };
    });
  } catch (error) {
    console.error('Error en getCotizacionesPendientesAprobacion:', error);
    throw new Error('Error al obtener cotizaciones pendientes de aprobación');
  }
}

  // Aprobar cotización
  async aprobarCotizacion(cotizacionId, superUsuarioId, superUsuarioNombre) {
    const transaction = await sequelize.transaction();
    
    try {
      // Verificar que la cotización existe y está pendiente de aprobación
      const [cotizacionResult] = await sequelize.query(`
        SELECT cotizaciones_id, estado, total, clientes_id, usuarios_id
        FROM cotizaciones 
        WHERE cotizaciones_id = :cotizacionId 
          AND estado = 'pendiente_aprobacion'
      `, {
        replacements: { cotizacionId },
        transaction
      });

      if (!cotizacionResult.length) {
        throw new Error('Cotización no encontrada o no está pendiente de aprobación');
      }

      const cotizacion = cotizacionResult[0];

      // Actualizar estado a efectiva
      await sequelize.query(`
        UPDATE cotizaciones 
        SET 
          estado = 'efectiva',
          aprobado_por = :superUsuarioId,
          aprobado_por_nombre = :superUsuarioNombre,
          fecha_aprobacion = NOW(),
          updated_at = NOW()
        WHERE cotizaciones_id = :cotizacionId
      `, {
        replacements: {
          cotizacionId,
          superUsuarioId,
          superUsuarioNombre
        },
        transaction
      });

      await transaction.commit();

      return {
        cotizacionId,
        nuevoEstado: 'efectiva',
        aprobadoPor: superUsuarioNombre,
        fechaAprobacion: new Date()
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error en aprobarCotizacion:', error);
      throw error;
    }
  }

  // Rechazar cotización
  async rechazarCotizacion(cotizacionId, superUsuarioId, superUsuarioNombre, motivo) {
    const transaction = await sequelize.transaction();
    
    try {
      // Verificar que la cotización existe y está pendiente de aprobación
      const [cotizacionResult] = await sequelize.query(`
        SELECT cotizaciones_id, estado, total, clientes_id, usuarios_id
        FROM cotizaciones 
        WHERE cotizaciones_id = :cotizacionId 
          AND estado = 'pendiente_aprobacion'
      `, {
        replacements: { cotizacionId },
        transaction
      });

      if (!cotizacionResult.length) {
        throw new Error('Cotización no encontrada o no está pendiente de aprobación');
      }

      const cotizacion = cotizacionResult[0];

      // Actualizar estado a rechazada
      await sequelize.query(`
        UPDATE cotizaciones 
        SET 
          estado = 'rechazada',
          rechazado_por = :superUsuarioId,
          rechazado_por_nombre = :superUsuarioNombre,
          fecha_rechazo = NOW(),
          motivo_rechazo = :motivo,
          updated_at = NOW()
        WHERE cotizaciones_id = :cotizacionId
      `, {
        replacements: {
          cotizacionId,
          superUsuarioId,
          superUsuarioNombre,
          motivo
        },
        transaction
      });

      await transaction.commit();

      return {
        cotizacionId,
        nuevoEstado: 'rechazada',
        rechazadoPor: superUsuarioNombre,
        fechaRechazo: new Date(),
        motivo
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error en rechazarCotizacion:', error);
      throw error;
    }
  }

  // Métodos auxiliares (iguales que en dashboardService)
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
}

module.exports = new SuperDashboardService();