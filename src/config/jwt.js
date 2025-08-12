// config/jwt.js - Configuración para producción cross-origin
module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  cookieOptions: {
    httpOnly: true,
    secure: true,        // ✅ CAMBIAR: true para HTTPS en producción
    sameSite: 'none',    // ✅ CAMBIAR: 'none' para cross-origin
    maxAge: 60 * 60 * 1000,
    path: '/',
  }
};