require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { connectDB, syncModels } = require('./src/models');
const { errorHandler, notFound, cleanupExpiredSessions } = require('./src/middlewares/errorHandler');

// Importar rutas principales
const apiRoutes = require('./src/routes');

const app = express();

// Configurar rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Configurar CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true, // Importante para cookies
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

// Todas las rutas del API
app.use('/api', apiRoutes);

// Middlewares de error (deben ir al final)
app.use(notFound);
app.use(errorHandler);

// Inicializar servidor
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    // Sincronizar modelos
    await syncModels();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error iniciando el servidor:', error);
    process.exit(1);
  }
};

startServer();