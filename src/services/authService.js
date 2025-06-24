const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Usuario, Sesion } = require('../models');
const jwtConfig = require('../config/jwt');
const crypto = require('crypto');

class AuthService {
  // Crear nueva sesión
  async createSession(usuario, deviceInfo = {}) {
    try {
      const sessionToken = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Crear JWT
      const jwtPayload = {
        user_id: usuario.usuarios_id,
        session_id: sessionToken,
        tipo_usuario: usuario.tipo_usuario,
        iat: Math.floor(Date.now() / 1000)
      };

      const token = jwt.sign(jwtPayload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn
      });

      // Hash del JWT para almacenar en BD
      const jwtHash = crypto.createHash('sha256').update(token).digest('hex');

      // Crear sesión en BD
      const sesion = await Sesion.create({
        usuarios_id: usuario.usuarios_id,
        session_token: sessionToken,
        jwt_hash: jwtHash,
        device_info: deviceInfo.device || null,
        ip_address: deviceInfo.ip || null,
        user_agent: deviceInfo.userAgent || null,
        expires_at: expiresAt,
        estado: 'activa'
      });

      return {
        token,
        sessionToken,
        expiresAt,
        sesion
      };
    } catch (error) {
      throw new Error('Error creando sesión: ' + error.message);
    }
  }

  // Renovar token (para heartbeat)
  async renewToken(sessionToken, userId) {
    try {
      const sesion = await Sesion.findOne({
        where: {
          session_token: sessionToken,
          usuarios_id: userId,
          estado: 'activa'
        },
        include: [{
          model: Usuario,
          as: 'usuario',
          where: { estado: 'activo' }
        }]
      });

      if (!sesion) {
        throw new Error('Sesión no encontrada o inválida');
      }

      // Verificar si no ha expirado
      if (new Date() > sesion.expires_at) {
        await sesion.update({ estado: 'expirada' });
        throw new Error('Sesión expirada');
      }

      // Crear nuevo JWT
      const jwtPayload = {
        user_id: sesion.usuario.usuarios_id,
        session_id: sessionToken,
        tipo_usuario: sesion.usuario.tipo_usuario,
        iat: Math.floor(Date.now() / 1000)
      };

      const newToken = jwt.sign(jwtPayload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn
      });

      const jwtHash = crypto.createHash('sha256').update(newToken).digest('hex');

      // Actualizar sesión
      const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await sesion.update({
        jwt_hash: jwtHash,
        last_activity: new Date(),
        expires_at: newExpiresAt
      });

      return {
        token: newToken,
        expiresAt: newExpiresAt
      };
    } catch (error) {
      throw new Error('Error renovando token: ' + error.message);
    }
  }

  // Cerrar sesión
  async logout(sessionToken, userId) {
    try {
      const sesion = await Sesion.findOne({
        where: {
          session_token: sessionToken,
          usuarios_id: userId
        }
      });

      if (sesion) {
        await sesion.update({ estado: 'revocada' });
      }

      return true;
    } catch (error) {
      throw new Error('Error cerrando sesión: ' + error.message);
    }
  }

  // Cerrar todas las sesiones de un usuario
  async logoutAll(userId) {
    try {
      await Sesion.update(
        { estado: 'revocada' },
        {
          where: {
            usuarios_id: userId,
            estado: 'activa'
          }
        }
      );

      return true;
    } catch (error) {
      throw new Error('Error cerrando todas las sesiones: ' + error.message);
    }
  }

  // Obtener sesiones activas de un usuario
  async getActiveSessions(userId) {
    try {
      const sesiones = await Sesion.findAll({
        where: {
          usuarios_id: userId,
          estado: 'activa'
        },
        order: [['last_activity', 'DESC']],
        attributes: ['sesiones_id', 'device_info', 'ip_address', 'last_activity', 'created_at']
      });

      return sesiones;
    } catch (error) {
      throw new Error('Error obteniendo sesiones: ' + error.message);
    }
  }
}

module.exports = new AuthService();