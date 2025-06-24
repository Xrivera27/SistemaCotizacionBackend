const jwt = require('jsonwebtoken');
const { Usuario, Sesion } = require('../models');
const jwtConfig = require('../config/jwt');

// Middleware para verificar JWT y sesión activa
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.auth_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    // Verificar JWT
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    // Verificar que la sesión siga activa en la BD
    const sesion = await Sesion.findOne({
      where: {
        session_token: decoded.session_id,
        estado: 'activa',
        usuarios_id: decoded.user_id
      },
      include: [{
        model: Usuario,
        as: 'usuario',
        where: { estado: 'activo' }
      }]
    });

    if (!sesion) {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida o expirada'
      });
    }

    // Verificar si la sesión no ha expirado
    if (new Date() > sesion.expires_at) {
      await sesion.update({ estado: 'expirada' });
      return res.status(401).json({
        success: false,
        message: 'Sesión expirada'
      });
    }

    // Actualizar última actividad
    await sesion.update({ last_activity: new Date() });

    // Adjuntar información del usuario al request
    req.user = {
      id: sesion.usuario.usuarios_id,
      nombre_completo: sesion.usuario.nombre_completo,
      correo: sesion.usuario.correo,
      usuario: sesion.usuario.usuario,
      tipo_usuario: sesion.usuario.tipo_usuario,
      session_id: decoded.session_id
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    console.error('Error en autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar roles específicos
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!roles.includes(req.user.tipo_usuario)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso'
      });
    }

    next();
  };
};

// Middleware para verificar que solo el vendedor vea sus clientes
const requireOwnership = async (req, res, next) => {
  try {
    const { tipo_usuario, id } = req.user;
    
    // Si es admin o super_usuario, puede ver todo
    if (tipo_usuario === 'admin' || tipo_usuario === 'super_usuario') {
      return next();
    }

    // Si es vendedor, solo sus propios recursos
    if (tipo_usuario === 'vendedor') {
      req.vendedor_id = id; // Para usar en los controllers
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Acceso denegado'
    });
  } catch (error) {
    console.error('Error en verificación de propiedad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnership
};