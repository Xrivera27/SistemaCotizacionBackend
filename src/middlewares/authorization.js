// middlewares/authorization.js
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

// Middleware para verificar que el usuario sea administrador
const requireAdmin = (req, res, next) => {
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }
  
  // Verificar que el usuario sea admin
  if (req.user.tipo_usuario !== 'admin') {
    
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo los administradores pueden realizar esta acción.'
    });
  }

  next();
};

// Middleware para verificar que el usuario sea admin o super_usuario
const requireAdminOrSuper = (req, res, next) => {
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }
  
  if (!['admin', 'super_usuario'].includes(req.user.tipo_usuario)) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador o supervisor.'
    });
  }
  
  next();
};

// Middleware para verificar que el usuario solo pueda editar su propio perfil (excepto admins)
const requireOwnerOrAdmin = (req, res, next) => {
  
  const { id } = req.params;
  const userId = req.user.id;
  const userType = req.user.tipo_usuario;
  
  // Los admins pueden editar cualquier usuario
  if (userType === 'admin') {
    
    return next();
  }
  
  // Los usuarios solo pueden editar su propio perfil
  if (parseInt(id) === parseInt(userId)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Solo puedes editar tu propio perfil'
  });
};

// Middleware de autenticación (verificar JWT desde cookies o headers)
const authenticateToken = async (req, res, next) => {
  
  try {
    let token = null;
    
    // 1. Intentar obtener token del header Authorization
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.split(' ')[1]) {
      token = authHeader.split(' ')[1]; // Bearer TOKEN
    }
    
    // 2. Si no hay en header, intentar obtener de cookies
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
      
    }
    
    if (!token) {
      
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }
    
    
    // Verificar el JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta');
    
    // Buscar el usuario en la base de datos usando el campo correcto
    const usuario = await Usuario.findByPk(decoded.user_id, { // ✅ CAMBIO AQUÍ: usar decoded.user_id
      attributes: ['usuarios_id', 'nombre_completo', 'correo', 'usuario', 'tipo_usuario', 'estado']
    });
    
    if (!usuario) {
      
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido'
      });
    }
    
    if (usuario.estado !== 'activo') {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }
    
    // Agregar usuario a la request con el formato que usas
    req.user = {
      id: usuario.usuarios_id,
      usuarios_id: usuario.usuarios_id,
      nombre_completo: usuario.nombre_completo,
      correo: usuario.correo,
      usuario: usuario.usuario,
      tipo_usuario: usuario.tipo_usuario,
      estado: usuario.estado
    };
    
    next();
    
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware de autorización por roles
const authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    
    if (!req.user) {
      
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    if (!allowedRoles.includes(req.user.tipo_usuario)) {
      
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción',
        requiredRoles: allowedRoles,
        userRole: req.user.tipo_usuario
      });
    }
    
    next();
  };
};

// Middleware para verificar autenticación sin roles específicos
const requireAuth = authenticateToken;

// Middleware para verificar solo vendedores
const requireVendedor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }
  
  if (req.user.tipo_usuario !== 'vendedor') {
    return res.status(403).json({
      success: false,
      message: 'Solo vendedores pueden realizar esta acción'
    });
  }
  
  next();
};

// Middleware para verificar todos los roles (cualquier usuario autenticado)
const requireAnyRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }
  
  if (!['admin', 'vendedor', 'super_usuario'].includes(req.user.tipo_usuario)) {
    return res.status(403).json({
      success: false,
      message: 'Rol de usuario no válido'
    });
  }
  
  next();
};

const requireSuperUsuario = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }
  
  if (req.user.tipo_usuario !== 'super_usuario') {
    return res.status(403).json({
      success: false,
      message: 'Solo supervisores pueden realizar esta acción'
    });
  }
  
  next();
};

module.exports = {
  // Middlewares originales
  requireAdmin,
  requireAdminOrSuper,
  requireOwnerOrAdmin,
  requireSuperUsuario,
  
  // Nuevos middlewares
  authenticateToken,
  authorizeRoles,
  requireAuth,
  requireVendedor,
  requireAnyRole
};