// config/jwt.js - Configuración corregida
module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  cookieOptions: {
    httpOnly: true,
    secure: false, // ✅ DEBE ser false en desarrollo
    sameSite: 'lax', // ✅ CAMBIO CRÍTICO
    maxAge: 60 * 60 * 1000,
    path: '/', // ✅ AGREGAR path
  }
};