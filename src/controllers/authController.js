const { Usuario } = require('../models');
const authService = require('../services/authService');
const emailService = require('../services/emailService');
const jwtConfig = require('../config/jwt');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Sesion } = require('../models');

class AuthController {
  // Login
  async login(req, res) {
    try {
      const { usuario, password } = req.validatedData;

      // Buscar usuario
      const user = await Usuario.findOne({
        where: { 
          usuario,
          estado: 'activo'
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar password
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Información del dispositivo
      const deviceInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        device: req.get('User-Agent')?.includes('Mobile') ? 'Mobile' : 'Desktop'
      };

      // Crear sesión
      const { token, expiresAt } = await authService.createSession(user, deviceInfo);

      // Configurar cookie
      res.cookie('auth_token', token, jwtConfig.cookieOptions);

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            id: user.usuarios_id,
            nombre_completo: user.nombre_completo,
            correo: user.correo,
            usuario: user.usuario,
            tipo_usuario: user.tipo_usuario
          },
          expiresAt
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Forgot Password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Validar que el email venga en la request
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'El email es requerido'
        });
      }

      // Validar formato del email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'El formato del email no es válido'
        });
      }

      // Buscar usuario por email
      const usuario = await Usuario.findOne({
        where: { 
          correo: email,
          estado: 'activo'
        }
      });

      if (!usuario) {
        // Por seguridad, no revelamos si el email existe o no
        return res.status(200).json({
          success: true,
          message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación'
        });
      }

      // Generar contraseña temporal
      const temporaryPassword = emailService.generateTemporaryPassword(8);

      // Encriptar la contraseña temporal
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(temporaryPassword, saltRounds);

      // Actualizar la contraseña en la base de datos
      await Usuario.update(
        { password: hashedPassword },
        { where: { usuarios_id: usuario.usuarios_id } }
      );

      // Enviar email con la contraseña temporal
      const emailResult = await emailService.sendPasswordResetEmail(
        email,
        temporaryPassword,
        usuario.nombre_completo
      );

      if (emailResult.success) {
        return res.status(200).json({
          success: true,
          message: 'Se ha enviado un email con tu nueva contraseña temporal'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Error al enviar el email. Contacta al administrador'
        });
      }

    } catch (error) {
      console.error('Error en forgotPassword:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Logout
  async logout(req, res) {
    try {
      const { session_id, id } = req.user;

      await authService.logout(session_id, id);

      // Limpiar cookie
      res.clearCookie('auth_token');

      res.json({
        success: true,
        message: 'Logout exitoso'
      });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Logout de todas las sesiones
  async logoutAll(req, res) {
    try {
      const { id } = req.user;

      await authService.logoutAll(id);

      // Limpiar cookie
      res.clearCookie('auth_token');

      res.json({
        success: true,
        message: 'Todas las sesiones han sido cerradas'
      });
    } catch (error) {
      console.error('Error en logout all:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Heartbeat - renovar token (MÉTODO ORIGINAL)
  async heartbeat(req, res) {
    try {
      const { session_id, id } = req.user;

      const { token, expiresAt } = await authService.renewToken(session_id, id);

      // Actualizar cookie con nuevo token
      res.cookie('auth_token', token, jwtConfig.cookieOptions);

      res.json({
        success: true,
        message: 'Token renovado',
        data: { expiresAt }
      });
    } catch (error) {
      console.error('Error en heartbeat:', error);
      
      // Si hay error, limpiar cookie y pedir relogin
      res.clearCookie('auth_token');
      
      res.status(401).json({
        success: false,
        message: 'Sesión inválida, por favor inicia sesión nuevamente'
      });
    }
  }

  // 🆕 HEARTBEAT LIGERO (SIN BD)
  async lightHeartbeat(req, res) {
    try {
      // Solo verificar que el JWT es válido, SIN tocar la base de datos
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar si el token expira en menos de 30 minutos
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now;
        const thirtyMinutes = 30 * 60;
        
        res.json({
          success: true,
          message: 'Token válido',
          expiresIn: expiresIn,
          needsRenewal: expiresIn < thirtyMinutes,
          timestamp: new Date().toISOString()
        });
        
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido',
          expired: jwtError.name === 'TokenExpiredError'
        });
      }

    } catch (error) {
      console.error('❌ Error en light heartbeat:', error);
      res.status(500).json({
        success: false,
        message: 'Error verificando token'
      });
    }
  }

  // 🆕 RENOVAR TOKEN OPTIMIZADO
  async renewTokenOptimized(req, res) {
    try {
      const { session_id, user_id } = req.user; // Del middleware de auth
      
      // Usar transacción para garantizar consistencia
      const { sequelize } = require('../models');
      const result = await sequelize.transaction(async (transaction) => {
        
        // 1. Buscar sesión activa (query optimizada)
        const sesion = await Sesion.findOne({
          where: {
            session_token: session_id,
            usuarios_id: user_id,
            estado: 'activa',
            expires_at: { [sequelize.Op.gt]: new Date() }
          },
          transaction,
          lock: true // Evitar condiciones de carrera
        });

        if (!sesion) {
          throw new Error('Sesión no válida o expirada');
        }

        // 2. Crear nuevo JWT
        const jwtPayload = {
          user_id: user_id,
          session_id: session_id,
          tipo_usuario: req.user.tipo_usuario,
          iat: Math.floor(Date.now() / 1000)
        };

        const newToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        });

        const jwtHash = crypto.createHash('sha256').update(newToken).digest('hex');
        const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // 3. Actualizar sesión (una sola query)
        await sesion.update({
          jwt_hash: jwtHash,
          last_activity: new Date(),
          expires_at: newExpiresAt
        }, { transaction });

        return {
          token: newToken,
          expiresAt: newExpiresAt
        };
      });

      // Actualizar cookie con nuevo token
      res.cookie('auth_token', result.token, jwtConfig.cookieOptions);

      res.json({
        success: true,
        message: 'Token renovado',
        data: result
      });

    } catch (error) {
      console.error('❌ Error renovando token:', error);
      
      // Si hay error, limpiar cookie
      res.clearCookie('auth_token');
      
      res.status(401).json({
        success: false,
        message: error.message || 'Error renovando token'
      });
    }
  }

  // 🆕 HEARTBEAT COMPLETO CON BD (solo cuando sea necesario)
  async fullHeartbeat(req, res) {
    try {
      const { session_id, user_id } = req.user;
      
      const result = await authService.renewToken(session_id, user_id);
      
      // Actualizar cookie con nuevo token
      res.cookie('auth_token', result.token, jwtConfig.cookieOptions);
      
      res.json({
        success: true,
        message: 'Sesión renovada',
        data: result
      });
      
    } catch (error) {
      console.error('❌ Error en full heartbeat:', error);
      
      // Si hay error, limpiar la sesión
      try {
        await authService.logout(req.user.session_id, req.user.user_id);
      } catch (logoutError) {
        console.error('Error limpiando sesión:', logoutError);
      }
      
      // Limpiar cookie
      res.clearCookie('auth_token');
      
      res.status(401).json({
        success: false,
        message: error.message || 'Sesión inválida'
      });
    }
  }

  // Verificar sesión actual
  async me(req, res) {
    try {
      const user = await Usuario.findByPk(req.user.id, {
        attributes: ['usuarios_id', 'nombre_completo', 'correo', 'usuario', 'tipo_usuario', 'telefono']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.usuarios_id,
            nombre_completo: user.nombre_completo,
            correo: user.correo,
            usuario: user.usuario,
            tipo_usuario: user.tipo_usuario,
            telefono: user.telefono
          }
        }
      });
    } catch (error) {
      console.error('Error en me:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener sesiones activas
  async getSessions(req, res) {
    try {
      const { id } = req.user;

      const sesiones = await authService.getActiveSessions(id);

      res.json({
        success: true,
        data: { sesiones }
      });
    } catch (error) {
      console.error('Error obteniendo sesiones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Revocar sesión específica
  async revokeSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { id } = req.user;

      await authService.logout(sessionId, id);

      res.json({
        success: true,
        message: 'Sesión revocada exitosamente'
      });
    } catch (error) {
      console.error('Error revocando sesión:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new AuthController();