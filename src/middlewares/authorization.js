// middlewares/authorization.js

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

module.exports = {
  requireAdmin,
  requireAdminOrSuper,
  requireOwnerOrAdmin
};