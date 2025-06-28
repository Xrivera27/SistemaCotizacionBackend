const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

class ConfiguracionController {
  
  // Obtener información personal del usuario logueado
  async getInformacionPersonal(req, res) {
    try {
      console.log('=== GET INFORMACIÓN PERSONAL ===');
      console.log('Usuario ID:', req.user.usuarios_id || req.user.id);
      
      const usuarioId = req.user.usuarios_id || req.user.id;
      
      const usuario = await Usuario.findByPk(usuarioId, {
        attributes: [
          'usuarios_id',
          'nombre_completo',
          'correo',
          'usuario',
          'telefono',
          'tipo_usuario',
          'estado',
          'created_at',
          'updated_at'
        ]
      });
      
      if (!usuario) {
        console.log('❌ Usuario no encontrado');
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      // Mapear los datos para que coincidan con el frontend
      const datosUsuario = {
        nombre: usuario.nombre_completo,
        email: usuario.correo,
        usuario: usuario.usuario,
        telefono: usuario.telefono || '',
        rolTexto: getRolTexto(usuario.tipo_usuario)
      };
      
      console.log('✅ Información personal obtenida');
      
      res.json({
        success: true,
        data: datosUsuario
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo información personal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Actualizar información personal del usuario logueado
  async actualizarInformacionPersonal(req, res) {
    try {
      console.log('=== ACTUALIZAR INFORMACIÓN PERSONAL ===');
      const usuarioId = req.user.usuarios_id || req.user.id;
      console.log('Usuario ID:', usuarioId);
      console.log('Datos recibidos:', req.validatedData);
      
      const usuario = await Usuario.findByPk(usuarioId);
      
      if (!usuario) {
        console.log('❌ Usuario no encontrado');
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      const {
        nombre,
        email,
        usuario: nombreUsuario,
        telefono
      } = req.validatedData;
      
      // Verificar si hay algún campo para actualizar
      if (!nombre && !email && !nombreUsuario && telefono === undefined) {
        console.log('❌ No hay campos para actualizar');
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar al menos un campo para actualizar'
        });
      }
      
      // Verificar si el correo o usuario ya existen en otros usuarios (solo si se proporcionaron)
      if (email || nombreUsuario) {
        const conditions = [];
        if (email && email !== usuario.correo) conditions.push({ correo: email });
        if (nombreUsuario && nombreUsuario !== usuario.usuario) conditions.push({ usuario: nombreUsuario });
        
        if (conditions.length > 0) {
          const usuarioExistente = await Usuario.findOne({
            where: {
              [Op.and]: [
                { usuarios_id: { [Op.ne]: usuarioId } },
                { [Op.or]: conditions }
              ]
            }
          });
          
          if (usuarioExistente) {
            const campo = usuarioExistente.correo === email ? 'correo' : 'usuario';
            console.log(`❌ ${campo} ya está en uso`);
            return res.status(400).json({
              success: false,
              message: `El ${campo} ya está en uso`
            });
          }
        }
      }
      
      // Preparar datos para actualizar (solo los campos que se enviaron)
      const datosActualizacion = {};
      if (nombre !== undefined && nombre.trim() !== '') datosActualizacion.nombre_completo = nombre;
      if (email !== undefined && email.trim() !== '') datosActualizacion.correo = email;
      if (nombreUsuario !== undefined && nombreUsuario.trim() !== '') datosActualizacion.usuario = nombreUsuario;
      if (telefono !== undefined) datosActualizacion.telefono = telefono; // Puede ser vacío
      
      console.log('Datos a actualizar:', datosActualizacion);
      
      // Solo actualizar si hay campos que cambiar
      if (Object.keys(datosActualizacion).length === 0) {
        console.log('❌ No hay cambios para aplicar');
        return res.status(400).json({
          success: false,
          message: 'No hay cambios para aplicar'
        });
      }
      
      await usuario.update(datosActualizacion);
      
      console.log('✅ Información personal actualizada exitosamente');
      
      // Obtener usuario actualizado
      const usuarioActualizado = await Usuario.findByPk(usuarioId, {
        attributes: [
          'usuarios_id',
          'nombre_completo',
          'correo',
          'usuario',
          'telefono',
          'tipo_usuario',
          'estado'
        ]
      });
      
      // Mapear respuesta
      const respuesta = {
        nombre: usuarioActualizado.nombre_completo,
        email: usuarioActualizado.correo,
        usuario: usuarioActualizado.usuario,
        telefono: usuarioActualizado.telefono || '',
        rolTexto: getRolTexto(usuarioActualizado.tipo_usuario)
      };
      
      res.json({
        success: true,
        message: 'Información personal actualizada correctamente',
        data: respuesta
      });
      
    } catch (error) {
      console.error('❌ Error actualizando información personal:', error);
      
      if (error.name === 'SequelizeValidationError') {
        const errores = error.errors.map(err => ({
          campo: err.path,
          mensaje: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errores
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Cambiar contraseña del usuario logueado
  async cambiarContrasena(req, res) {
    try {
      console.log('=== CAMBIAR CONTRASEÑA ===');
      const usuarioId = req.user.usuarios_id || req.user.id;
      console.log('Usuario ID:', usuarioId);
      
      const usuario = await Usuario.findByPk(usuarioId);
      
      if (!usuario) {
        console.log('❌ Usuario no encontrado');
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      const { actual, nueva, confirmar } = req.validatedData;
      
      // Verificar contraseña actual
      const isPasswordValid = await usuario.comparePassword(actual);
      
      if (!isPasswordValid) {
        console.log('❌ Contraseña actual incorrecta');
        return res.status(400).json({
          success: false,
          message: 'La contraseña actual es incorrecta'
        });
      }
      
      // Verificar que las contraseñas nuevas coincidan
      if (nueva !== confirmar) {
        console.log('❌ Las contraseñas nuevas no coinciden');
        return res.status(400).json({
          success: false,
          message: 'Las contraseñas nuevas no coinciden'
        });
      }
      
      // Actualizar contraseña (se encripta automáticamente en el hook beforeUpdate)
      await usuario.update({ password: nueva });
      
      console.log('✅ Contraseña cambiada exitosamente');
      
      res.json({
        success: true,
        message: 'Contraseña cambiada exitosamente'
      });
      
    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

// Función auxiliar para convertir tipo de usuario a texto legible
function getRolTexto(tipoUsuario) {
  const roles = {
    'admin': 'Administrador',
    'super_usuario': 'Super Usuario',
    'vendedor': 'Vendedor'
  };
  
  return roles[tipoUsuario] || 'Sin Rol';
}

module.exports = new ConfiguracionController();