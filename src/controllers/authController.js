const { Usuario } = require('../models');
const authService = require('../services/authService');
const emailService = require('../services/emailService');
const jwtConfig = require('../config/jwt');
const bcrypt = require('bcrypt');

class AuthController {
  // Login
  async login(req, res) {
    try {
      console.log('=== LOGIN REQUEST ===');
      console.log('Body recibido:', req.body);
      console.log('Validated data:', req.validatedData);
      
      const { usuario, password } = req.validatedData;
      
      console.log('Buscando usuario:', usuario);

      // Buscar usuario
      const user = await Usuario.findOne({
        where: { 
          usuario,
          estado: 'activo'
        }
      });

      console.log('Usuario encontrado:', user ? 'SÍ' : 'NO');
      if (user) {
        console.log('Password en BD:', user.password);
        console.log('Password recibido:', password);
      }

      if (!user) {
        console.log('Usuario no encontrado o inactivo');
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar password
      console.log('Verificando password...');
      const isPasswordValid = await user.comparePassword(password);
      console.log('Password válido:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('Password inválido');
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      console.log('Login exitoso, creando sesión...');

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

      console.log('Sesión creada exitosamente');

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

  // Forgot Password - NUEVO MÉTODO
  async forgotPassword(req, res) {
    try {
      console.log('=== FORGOT PASSWORD REQUEST ===');
      console.log('Body recibido:', req.body);
      
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

      console.log(`🔍 Buscando usuario con email: ${email}`);

      // Buscar usuario por email
      const usuario = await Usuario.findOne({
        where: { 
          correo: email,
          estado: 'activo'
        }
      });

      if (!usuario) {
        console.log(`❌ Usuario no encontrado con email: ${email}`);
        // Por seguridad, no revelamos si el email existe o no
        return res.status(200).json({
          success: true,
          message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación'
        });
      }

      console.log(`✅ Usuario encontrado: ${usuario.nombre_completo} (${usuario.usuario})`);

      // Generar contraseña temporal
      const temporaryPassword = emailService.generateTemporaryPassword(8);
      console.log(`🔑 Contraseña temporal generada: ${temporaryPassword}`);

      // Encriptar la contraseña temporal
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(temporaryPassword, saltRounds);
      console.log(`🔒 Contraseña encriptada correctamente`);

      // Actualizar la contraseña en la base de datos
      await Usuario.update(
        { password: hashedPassword },
        { where: { usuarios_id: usuario.usuarios_id } }
      );

      console.log(`📝 Contraseña actualizada en BD para usuario: ${usuario.usuario}`);

      // Enviar email con la contraseña temporal
      const emailResult = await emailService.sendPasswordResetEmail(
        email,
        temporaryPassword,
        usuario.nombre_completo
      );

      if (emailResult.success) {
        console.log(`📧 Email enviado exitosamente a: ${email}`);
        return res.status(200).json({
          success: true,
          message: 'Se ha enviado un email con tu nueva contraseña temporal'
        });
      } else {
        console.error(`❌ Error enviando email:`, emailResult.error);
        
        return res.status(500).json({
          success: false,
          message: 'Error al enviar el email. Contacta al administrador'
        });
      }

    } catch (error) {
      console.error('💥 Error en forgotPassword:', error);
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

  // Heartbeat - renovar token
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