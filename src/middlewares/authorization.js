// middlewares/authorization.js
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

// Middleware para verificar que el usuario sea administrador
const requireAdmin = (req, res, next) => {
  console.log('🔐 Verificando permisos de administrador...');
  console.log('Usuario actual:', req.user);
  
  if (!req.user) {
    console.log('❌ No hay usuario autenticado');
    return res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }
  
  // Verificar que el usuario sea admin
  if (req.user.tipo_usuario !== 'admin') {
    console.log('❌ Usuario no es administrador:', req.user.tipo_usuario);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo los administradores pueden realizar esta acción.'
    });
  }
  
  console.log('✅ Usuario es administrador, acceso permitido');
  next();
};

// Middleware para verificar que el usuario sea admin o super_usuario
const requireAdminOrSuper = (req, res, next) => {
  console.log('🔐 Verificando permisos de admin o super usuario...');
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }
  
  if (!['admin', 'super_usuario'].includes(req.user.tipo_usuario)) {
    console.log('❌ Usuario no tiene permisos:', req.user.tipo_usuario);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador o supervisor.'
    });
  }
  
  console.log('✅ Usuario tiene permisos, acceso permitido');
  next();
};

// Middleware para verificar que el usuario solo pueda editar su propio perfil (excepto admins)
const requireOwnerOrAdmin = (req, res, next) => {
  console.log('🔐 Verificando permisos de propietario o admin...');
  
  const { id } = req.params;
  const userId = req.user.id;
  const userType = req.user.tipo_usuario;
  
  // Los admins pueden editar cualquier usuario
  if (userType === 'admin') {
    console.log('✅ Usuario es admin, acceso permitido');
    return next();
  }
  
  // Los usuarios solo pueden editar su propio perfil
  if (parseInt(id) === parseInt(userId)) {
    console.log('✅ Usuario editando su propio perfil, acceso permitido');
    return next();
  }
  
  console.log('❌ Usuario intentando editar perfil ajeno sin permisos');
  return res.status(403).json({
    success: false,
    message: 'Solo puedes editar tu propio perfil'
  });
};

// Middleware de autenticación (verificar JWT desde cookies o headers)
const authenticateToken = async (req, res, next) => {
  console.log('🔐 Verificando token de autenticación...');
  
  try {
    let token = null;
    
    // 1. Intentar obtener token del header Authorization
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.split(' ')[1]) {
      token = authHeader.split(' ')[1]; // Bearer TOKEN
      console.log('🍪 Token encontrado en header Authorization');
    }
    
    // 2. Si no hay en header, intentar obtener de cookies
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
      console.log('🍪 Token encontrado en cookies');
    }
    
    if (!token) {
      console.log('❌ No se proporcionó token (ni en header ni en cookies)');
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }
    
    console.log('🔍 Verificando token:', token.substring(0, 20) + '...');
    
    // Verificar el JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta');
    console.log('🔍 Token decodificado:', decoded);
    
    // Buscar el usuario en la base de datos usando el campo correcto
    const usuario = await Usuario.findByPk(decoded.user_id, { // ✅ CAMBIO AQUÍ: usar decoded.user_id
      attributes: ['usuarios_id', 'nombre_completo', 'correo', 'usuario', 'tipo_usuario', 'estado']
    });
    
    if (!usuario) {
      console.log('❌ Usuario no encontrado en la base de datos con ID:', decoded.user_id);
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido'
      });
    }
    
    if (usuario.estado !== 'activo') {
      console.log('❌ Usuario inactivo');
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
    
    console.log('✅ Token válido, usuario autenticado:', usuario.usuario);
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
    console.log('🔐 Verificando roles permitidos:', allowedRoles);
    console.log('Usuario actual:', req.user?.usuario, 'Rol:', req.user?.tipo_usuario);
    
    if (!req.user) {
      console.log('❌ No hay usuario autenticado');
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    if (!allowedRoles.includes(req.user.tipo_usuario)) {
      console.log('❌ Rol no permitido:', req.user.tipo_usuario);
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción',
        requiredRoles: allowedRoles,
        userRole: req.user.tipo_usuario
      });
    }
    
    console.log('✅ Rol permitido, acceso concedido');
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

module.exports = {
  // Middlewares originales
  requireAdmin,
  requireAdminOrSuper,
  requireOwnerOrAdmin,
  
  // Nuevos middlewares
  authenticateToken,
  authorizeRoles,
  requireAuth,
  requireVendedor,
  requireAnyRole
};