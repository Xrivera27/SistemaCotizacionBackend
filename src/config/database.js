const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    timezone: '-06:00',
    logging: false, // ← LOGS COMPLETAMENTE DESACTIVADOS
    
    // Configuración mejorada del pool
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 30000,
      evict: 1000,
      handleDisconnects: true
    },
    
    // Configuración de reconexión
    retry: {
      max: 3,
      timeout: 3000,
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /TIMEOUT/,
        /ER_CON_COUNT_ERROR/,
        /ER_TOO_MANY_CONNECTIONS/
      ]
    },
    
    // Configuraciones sin las opciones problemáticas
    dialectOptions: {
      connectTimeout: 60000,
      keepAliveInitialDelay: 0,
      enableKeepAlive: true,
      ssl: false
      // ← REMOVIDAS: acquireTimeout y timeout (causan warnings)
    },
    
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    },
    
    // Hooks más silenciosos
    hooks: {
      beforeConnect: (config) => {
        // Solo log si hay problemas
        if (process.env.NODE_ENV === 'development') {
        }
      },
      afterConnect: (connection, config) => {
        if (process.env.NODE_ENV === 'development') {

        }
      },
      beforeDisconnect: (connection) => {
        // Eliminar este log molesto
        // console.log('🔌 Desconectando de MySQL...');
      }
    }
  }
);

// Función mejorada más silenciosa
const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✅ Conexión a MySQL establecida correctamente');
      
      // Configurar eventos de error sin logs excesivos
      sequelize.connectionManager.pool.on('error', (err) => {
        console.error('❌ Error en pool MySQL:', err.message);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
          setTimeout(() => connectDB(1), 2000); // Solo 1 reintento automático
        }
      });
      
      return;
    } catch (error) {
      if (i === retries - 1) {
        console.error('❌ No se pudo conectar a MySQL después de varios intentos');
        throw error;
      }
      
      console.error(`❌ Intento ${i + 1}/${retries} fallido: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
};

// Función para cerrar conexiones
const closeDB = async () => {
  try {
    await sequelize.close();
    console.log('🔌 Conexiones MySQL cerradas correctamente');
  } catch (error) {
    console.error('❌ Error cerrando conexiones:', error);
  }
};

// Manejar cierre graceful (sin logs duplicados)
process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servidor...');
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Cerrando servidor...');
  await closeDB();
  process.exit(0);
});

module.exports = { 
  sequelize, 
  connectDB, 
  closeDB 
};