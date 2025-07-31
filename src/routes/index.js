const express = require('express');
const { sequelize } = require('../models'); // Importar sequelize para monitoreo

const authRoutes = require('./auth');
const usuariosRoutes = require('./usuarios');
const clientesRoutes = require('./clientes'); 
const categoriasRoutes = require('./categorias'); 
const unidadesMedidaRoutes = require('./unidadesMedida');
const serviciosRoutes = require('./servicios');
const cotizacionesRoutes = require('./cotizaciones');
const cotizacionesVendedorRoutes = require('./cotizacionesVendedor');
const cotizacionVendedor = require('./cotizacionVendedor');
const pdfRoutes = require('./pdf');
const configuracionRoutes = require('./configuracion');
const dashboardRoutes = require('./dashboard'); 
const reportesRoutes = require('./reportes'); 

const router = express.Router();

// Registrar todas las rutas
router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/clientes', clientesRoutes); 
router.use('/categorias', categoriasRoutes); 
router.use('/unidades-medida', unidadesMedidaRoutes);
router.use('/servicios', serviciosRoutes);
router.use('/cotizaciones', cotizacionesRoutes);
router.use('/cotizaciones-vendedor', cotizacionesVendedorRoutes); 
router.use('/cotizacion-vendedor', cotizacionVendedor);
router.use('/pdf', pdfRoutes); 
router.use('/configuracion', configuracionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reportes', reportesRoutes); 

// Ruta de salud general del API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Ruta de salud de la base de datos
router.get('/health/database', async (req, res) => {
  try {
    // Probar conexión
    await sequelize.authenticate();
    
    // Obtener información del pool de conexiones
    const pool = sequelize.connectionManager.pool;
    const poolInfo = {
      using: pool.using || 0,      // Conexiones en uso
      waiting: pool.pending || 0,   // Conexiones esperando
      available: pool.available || 0, // Conexiones disponibles
      max: pool.max || 0,          // Máximo configurado
      min: pool.min || 0           // Mínimo configurado
    };
    
    // Ejecutar una consulta simple para verificar que la BD responde
    const [results] = await sequelize.query('SELECT 1 + 1 as result');
    
    res.json({
      success: true,
      message: 'Base de datos funcionando correctamente',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        pool: poolInfo,
        testQuery: results[0]?.result === 2 ? 'OK' : 'FAILED',
        dialect: sequelize.getDialect(),
        version: sequelize.getDatabaseVersion ? await sequelize.getDatabaseVersion() : 'N/A'
      }
    });
    
  } catch (error) {
    console.error('❌ Error en health check de BD:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error de conexión con la base de datos',
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code || 'UNKNOWN'
      }
    });
  }
});

// Ruta para estadísticas del servidor
router.get('/health/stats', (req, res) => {
  const stats = {
    success: true,
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };
  
  res.json(stats);
});

module.exports = router;