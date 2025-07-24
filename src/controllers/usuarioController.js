const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

class UsuarioController {
  
  // Obtener todos los usuarios con paginación y filtros
  async getUsuarios(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        tipo_usuario = '', 
        estado = '' 
      } = req.query;
      
      const offset = (page - 1) * limit;
      
      // Construir condiciones de búsqueda
      const whereConditions = {};
      
      if (search) {
        whereConditions[Op.or] = [
          { nombre_completo: { [Op.like]: `%${search}%` } },
          { correo: { [Op.like]: `%${search}%` } },
          { usuario: { [Op.like]: `%${search}%` } }
        ];
      }
      
      if (tipo_usuario) {
        whereConditions.tipo_usuario = tipo_usuario;
      }
      
      if (estado) {
        whereConditions.estado = estado;
      }
      
      const usuarios = await Usuario.findAndCountAll({
        where: whereConditions,
        attributes: [
          'usuarios_id',
          'nombre_completo',
          'correo',
          'usuario',
          'tipo_usuario',
          'telefono',
          'estado',
          'created_at',
          'updated_at'
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      const totalPages = Math.ceil(usuarios.count / limit);
      
      res.json({
        success: true,
        data: {
          usuarios: usuarios.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: usuarios.count,
            itemsPerPage: parseInt(limit),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener usuario por ID
  async getUsuarioById(req, res) {
    try {
      const { id } = req.params;
      
      const usuario = await Usuario.findByPk(id, {
        attributes: [
          'usuarios_id',
          'nombre_completo',
          'correo',
          'usuario',
          'tipo_usuario',
          'telefono',
          'estado',
          'created_at',
          'updated_at'
        ]
      });
      
      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      res.json({
        success: true,
        data: { usuario }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Crear nuevo usuario
  async createUsuario(req, res) {
    try {
      const {
        nombre_completo,
        correo,
        usuario,
        password,
        tipo_usuario,
        telefono
      } = req.validatedData;
      
      // Verificar si el usuario ya existe
      const usuarioExistente = await Usuario.findOne({
        where: {
          [Op.or]: [
            { correo },
            { usuario }
          ]
        }
      });
      
      if (usuarioExistente) {
        const campo = usuarioExistente.correo === correo ? 'correo' : 'usuario';
        return res.status(400).json({
          success: false,
          message: `El ${campo} ya está en uso`
        });
      }
      
      // Crear el usuario (el password se encripta automáticamente en el hook beforeCreate)
      const nuevoUsuario = await Usuario.create({
        nombre_completo,
        correo,
        usuario,
        password,
        tipo_usuario,
        telefono,
        estado: 'activo'
      });
      
      // Responder sin el password
      const usuarioRespuesta = {
        usuarios_id: nuevoUsuario.usuarios_id,
        nombre_completo: nuevoUsuario.nombre_completo,
        correo: nuevoUsuario.correo,
        usuario: nuevoUsuario.usuario,
        tipo_usuario: nuevoUsuario.tipo_usuario,
        telefono: nuevoUsuario.telefono,
        estado: nuevoUsuario.estado,
        created_at: nuevoUsuario.created_at,
        updated_at: nuevoUsuario.updated_at
      };
      
      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: { usuario: usuarioRespuesta }
      });
      
    } catch (error) {
      console.error('❌ Error creando usuario:', error);
      
      // Manejar errores de validación de Sequelize
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
  
  // Actualizar usuario
  async updateUsuario(req, res) {
    try {
      const { id } = req.params;
      
      const usuario = await Usuario.findByPk(id);
      
      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      const {
        nombre_completo,
        correo,
        usuario: nombreUsuario,
        password,
        tipo_usuario,
        telefono,
        estado
      } = req.validatedData;
      
      // Verificar si el correo o usuario ya existen en otros usuarios
      if (correo || nombreUsuario) {
        const conditions = [];
        if (correo) conditions.push({ correo });
        if (nombreUsuario) conditions.push({ usuario: nombreUsuario });
        
        const usuarioExistente = await Usuario.findOne({
          where: {
            [Op.and]: [
              { usuarios_id: { [Op.ne]: id } }, // Excluir el usuario actual
              { [Op.or]: conditions }
            ]
          }
        });
        
        if (usuarioExistente) {
          const campo = usuarioExistente.correo === correo ? 'correo' : 'usuario';
          return res.status(400).json({
            success: false,
            message: `El ${campo} ya está en uso`
          });
        }
      }
      
      // Preparar datos para actualizar
      const datosActualizacion = {};
      if (nombre_completo !== undefined) datosActualizacion.nombre_completo = nombre_completo;
      if (correo !== undefined) datosActualizacion.correo = correo;
      if (nombreUsuario !== undefined) datosActualizacion.usuario = nombreUsuario;
      if (password !== undefined) datosActualizacion.password = password; // Se encripta en beforeUpdate
      if (tipo_usuario !== undefined) datosActualizacion.tipo_usuario = tipo_usuario;
      if (telefono !== undefined) datosActualizacion.telefono = telefono;
      if (estado !== undefined) datosActualizacion.estado = estado;
      
      await usuario.update(datosActualizacion);
      
      // Obtener usuario actualizado sin password
      const usuarioActualizado = await Usuario.findByPk(id, {
        attributes: [
          'usuarios_id',
          'nombre_completo',
          'correo',
          'usuario',
          'tipo_usuario',
          'telefono',
          'estado',
          'created_at',
          'updated_at'
        ]
      });
      
      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: { usuario: usuarioActualizado }
      });
      
    } catch (error) {
      console.error('❌ Error actualizando usuario:', error);
      
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
  
  // Eliminar usuario (soft delete)
  async deleteUsuario(req, res) {
    try {
      const { id } = req.params;
      
      const usuario = await Usuario.findByPk(id);
      
      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      // Verificar que no se esté eliminando a sí mismo
      if (usuario.usuarios_id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propia cuenta'
        });
      }
      
      // Soft delete - cambiar estado a inactivo
      await usuario.update({ estado: 'inactivo' });
      
      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });
      
    } catch (error) {
      console.error('❌ Error eliminando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Restaurar usuario
  async restoreUsuario(req, res) {
    try {
      const { id } = req.params;
      
      const usuario = await Usuario.findByPk(id);
      
      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      await usuario.update({ estado: 'activo' });
      
      res.json({
        success: true,
        message: 'Usuario restaurado exitosamente'
      });
      
    } catch (error) {
      console.error('❌ Error restaurando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Cambiar contraseña
  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { password_actual, password_nuevo } = req.validatedData;
      
      const usuario = await Usuario.findByPk(id);
      
      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      // Verificar contraseña actual
      const isPasswordValid = await usuario.comparePassword(password_actual);
      
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña actual es incorrecta'
        });
      }
      
      // Actualizar contraseña
      await usuario.update({ password: password_nuevo });
      
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
  
  // Obtener estadísticas de usuarios
  async getEstadisticas(req, res) {
    try {
      const [total, activos, inactivos, administradores, vendedores, superUsuarios] = await Promise.all([
        Usuario.count(),
        Usuario.count({ where: { estado: 'activo' } }),
        Usuario.count({ where: { estado: 'inactivo' } }),
        Usuario.count({ where: { tipo_usuario: 'admin' } }),
        Usuario.count({ where: { tipo_usuario: 'vendedor' } }),
        Usuario.count({ where: { tipo_usuario: 'super_usuario' } })
      ]);
      
      const estadisticas = {
        total,
        activos,
        inactivos,
        por_tipo: {
          administradores,
          vendedores,
          super_usuarios: superUsuarios
        },
        porcentajes: {
          activos: total > 0 ? Math.round((activos / total) * 100) : 0,
          inactivos: total > 0 ? Math.round((inactivos / total) * 100) : 0
        }
      };
      
      res.json({
        success: true,
        data: { estadisticas }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener usuarios activos para ser managers (dropdown)
  async getUsuariosParaManager(req, res) {
    try {
      let whereConditions = {
        estado: 'activo'
      };
      
      // Filtros según rol del usuario actual
      if (req.user.tipo_usuario === 'vendedor') {
        // Vendedor solo puede asignarse a sí mismo
        whereConditions.usuarios_id = req.user.id;
      }
      // Admin y super_usuario pueden ver todos los usuarios activos
      
      const usuarios = await Usuario.findAll({
        where: whereConditions,
        attributes: [
          'usuarios_id',
          'nombre_completo',
          'correo',
          'usuario',
          'tipo_usuario'
        ],
        order: [['nombre_completo', 'ASC']]
      });
      
      res.json({
        success: true,
        data: { usuarios }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo usuarios para manager:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new UsuarioController();