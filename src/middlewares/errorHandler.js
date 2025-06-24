const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');

// Middleware global para manejo de errores
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Error:', err);

  // Error de validación de Sequelize
  if (err instanceof ValidationError) {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors
    });
  }

  // Error de constraint único (duplicado)
  if (err instanceof UniqueConstraintError) {
    const field = err.errors[0]?.path || 'campo';
    return res.status(409).json({
      success: false,
      message: `El ${field} ya existe en el sistema`
    });
  }

  // Error de llave foránea
  if (err instanceof ForeignKeyConstraintError) {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida: el registro relacionado no existe'
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }

  // Error de sintaxis JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Formato JSON inválido'
    });
  }

  // Error por defecto
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware para rutas no encontradas
const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Middleware para limpiar sesiones expiradas
const cleanupExpiredSessions = async (req, res, next) => {
  try {
    const { Sesion } = require('../models');
    
    // Ejecutar limpieza cada hora (verificar si han pasado 60 minutos desde la última limpieza)
    const lastCleanup = global.lastSessionCleanup || 0;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (now - lastCleanup > oneHour) {
      // Marcar sesiones expiradas
      await Sesion.update(
        { estado: 'expirada' },
        { 
          where: {
            expires_at: { [require('sequelize').Op.lt]: new Date() },
            estado: 'activa'
          }
        }
      );

      // Eliminar sesiones muy antiguas (más de 7 días)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await Sesion.destroy({
        where: {
          updated_at: { [require('sequelize').Op.lt]: sevenDaysAgo },
          estado: { [require('sequelize').Op.in]: ['expirada', 'revocada'] }
        }
      });

      global.lastSessionCleanup = now;
    }
  } catch (error) {
    console.error('Error en limpieza de sesiones:', error);
  }
  
  next();
};

module.exports = {
  errorHandler,
  notFound,
  cleanupExpiredSessions
};