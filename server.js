require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { connectDB, syncModels, closeDB } = require('./src/models');
const { errorHandler, notFound, cleanupExpiredSessions } = require('./src/middlewares/errorHandler');
const { requestLogger, dbErrorLogger } = require('./src/middlewares/requestLogger');

// Importar rutas principales
const apiRoutes = require('./src/routes');

const app = express();

// Configurar rate limiting
const limiter = rateLimit({
 windowMs: 15 * 60 * 1000,
 max: 6000,
 message: {
   success: false,
   message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
 },
 standardHeaders: true,
 legacyHeaders: false,
 // ✅ AGREGAR: Skip para rutas críticas de auth
 skip: (req) => {
   const criticalRoutes = [
     '/api/auth/login',
     '/api/auth/me', 
     '/api/auth/heartbeat',
     '/api/auth/ping',
     '/api/auth/logout'
   ];
   return criticalRoutes.some(route => req.path === route);
 }
});

// Configurar CORS
const corsOptions = {
 origin: process.env.FRONTEND_URL,
 credentials: true,
 optionsSuccessStatus: 200
};

// Middlewares globales
app.use(helmet());
app.use(limiter); 
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Middleware para obtener IP real
app.use((req, res, next) => {
 req.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
 next();
});

// Middleware de limpieza de sesiones
app.use(cleanupExpiredSessions);

// Middleware de logging (solo en development)
if (process.env.NODE_ENV === 'development') {
 app.use(requestLogger);
}

// Todas las rutas del API
app.use('/api', apiRoutes);

// Middlewares de error (deben ir al final)
app.use(dbErrorLogger);
app.use(notFound);
app.use(errorHandler);

// Inicializar servidor
const PORT = process.env.PORT || 3000;
let server;

const startServer = async () => {
 try {
   console.log('Iniciando servidor...');
   
   // Conectar a la base de datos
   await connectDB();
   
   // Sincronizar modelos
   await syncModels();
   
   // Iniciar servidor
   server = app.listen(PORT, () => {
     console.log(`Servidor ejecutándose en puerto ${PORT}`);
     console.log(`🛡️ Rate limit: 5,000 peticiones/15min (rutas auth exentas)`); // ✅ Info adicional
   });
   
   // Configurar timeouts del servidor
   server.timeout = 120000; // 2 minutos
   server.keepAliveTimeout = 65000; // 65 segundos
   server.headersTimeout = 66000; // 66 segundos
   
   // Manejar errores del servidor
   server.on('error', (error) => {
     console.error('❌ Error del servidor:', error);
   });
   
 } catch (error) {
   console.error('❌ Error iniciando el servidor:', error);
   process.exit(1);
 }
};

// Manejar cierre graceful
const gracefulShutdown = async (signal) => {
 console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor gracefully...`);
 
 if (server) {
   server.close(async () => {
     console.log('🔌 Servidor HTTP cerrado');
     
     try {
       await closeDB();
       console.log('✅ Cierre completo');
       process.exit(0);
     } catch (error) {
       console.error('❌ Error durante el cierre:', error);
       process.exit(1);
     }
   });
   
   // Forzar cierre después de 30 segundos
   setTimeout(() => {
     console.log('⏰ Forzando cierre después de timeout');
     process.exit(1);
   }, 30000);
 }
};

// Manejar señales de cierre
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
 console.error('❌ Excepción no capturada:', error);
 gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
 console.error('❌ Promesa rechazada no manejada:', reason);
 gracefulShutdown('unhandledRejection');
});

startServer();