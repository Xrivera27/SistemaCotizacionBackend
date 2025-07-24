const { Cliente, Usuario } = require('../models');
const { Op } = require('sequelize');

class ClienteService {
  
  // Obtener todos los clientes con paginación y filtros
  async getClientes(filters = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        estado = '',
        usuarios_id = null 
      } = filters;
      
      const offset = (page - 1) * limit;
      
      // Construir condiciones de búsqueda
      const whereConditions = {};
      
      if (search) {
        whereConditions[Op.or] = [
          { nombre_encargado: { [Op.like]: `%${search}%` } },
          { nombre_empresa: { [Op.like]: `%${search}%` } },
          { documento_fiscal: { [Op.like]: `%${search}%` } },
          { correo_personal: { [Op.like]: `%${search}%` } },
          { correo_empresa: { [Op.like]: `%${search}%` } }
        ];
      }
      
      if (estado) {
        whereConditions.estado = estado;
      }
      
      if (usuarios_id) {
        whereConditions.usuarios_id = usuarios_id;
      }
      
      const result = await Cliente.findAndCountAll({
        where: whereConditions,
        include: [{
          model: Usuario,
          as: 'manager',
          attributes: ['usuarios_id', 'nombre_completo', 'usuario', 'tipo_usuario']
        }],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      const totalPages = Math.ceil(result.count / limit);
      
      return {
        success: true,
        clientes: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: result.count,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
      
    } catch (error) {
      console.error('❌ Error en clienteService.getClientes:', error);
      throw error;
    }
  }
  
  // Obtener cliente por ID
  async getClienteById(id) {
    try {
      const cliente = await Cliente.findByPk(id, {
        include: [{
          model: Usuario,
          as: 'manager',
          attributes: ['usuarios_id', 'nombre_completo', 'usuario', 'tipo_usuario']
        }]
      });
      
      if (!cliente) {
        return {
          success: false,
          message: 'Cliente no encontrado'
        };
      }
      
      return {
        success: true,
        cliente
      };
      
    } catch (error) {
      console.error('❌ Error en clienteService.getClienteById:', error);
      throw error;
    }
  }
  
  // Crear nuevo cliente
  async createCliente(clienteData) {
    try {
      // Verificar si el documento fiscal ya existe
      const clienteExistente = await Cliente.findOne({
        where: { documento_fiscal: clienteData.documento_fiscal }
      });
      
      if (clienteExistente) {
        return {
          success: false,
          message: 'Ya existe un cliente con ese documento fiscal'
        };
      }
      
      // Verificar que el usuario manager existe
      const manager = await Usuario.findByPk(clienteData.usuarios_id);
      if (!manager) {
        return {
          success: false,
          message: 'El usuario asignado no existe'
        };
      }
      
      const nuevoCliente = await Cliente.create({
        ...clienteData,
        estado: 'activo'
      });
      
      // Obtener el cliente con la relación del manager
      const clienteCompleto = await Cliente.findByPk(nuevoCliente.clientes_id, {
        include: [{
          model: Usuario,
          as: 'manager',
          attributes: ['usuarios_id', 'nombre_completo', 'usuario', 'tipo_usuario']
        }]
      });
      
      return {
        success: true,
        cliente: clienteCompleto,
        message: 'Cliente creado exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en clienteService.createCliente:', error);
      throw error;
    }
  }
  
  // Actualizar cliente
  async updateCliente(id, clienteData) {
    try {
      const cliente = await Cliente.findByPk(id);
      
      if (!cliente) {
        return {
          success: false,
          message: 'Cliente no encontrado'
        };
      }
      
      // Si se está actualizando el documento fiscal, verificar que no exista
      if (clienteData.documento_fiscal && clienteData.documento_fiscal !== cliente.documento_fiscal) {
        const clienteExistente = await Cliente.findOne({
          where: { 
            documento_fiscal: clienteData.documento_fiscal,
            clientes_id: { [Op.ne]: id }
          }
        });
        
        if (clienteExistente) {
          return {
            success: false,
            message: 'Ya existe un cliente con ese documento fiscal'
          };
        }
      }
      
      // Si se está actualizando el usuario, verificar que existe
      if (clienteData.usuarios_id) {
        const manager = await Usuario.findByPk(clienteData.usuarios_id);
        if (!manager) {
          return {
            success: false,
            message: 'El usuario asignado no existe'
          };
        }
      }
      
      await cliente.update(clienteData);
      
      // Obtener cliente actualizado con relaciones
      const clienteActualizado = await Cliente.findByPk(id, {
        include: [{
          model: Usuario,
          as: 'manager',
          attributes: ['usuarios_id', 'nombre_completo', 'usuario', 'tipo_usuario']
        }]
      });
      
      return {
        success: true,
        cliente: clienteActualizado,
        message: 'Cliente actualizado exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en clienteService.updateCliente:', error);
      throw error;
    }
  }
  
  // Eliminar cliente (soft delete)
  async deleteCliente(id) {
    try {
      const cliente = await Cliente.findByPk(id);
      
      if (!cliente) {
        return {
          success: false,
          message: 'Cliente no encontrado'
        };
      }
      
      await cliente.update({ estado: 'inactivo' });
      
      return {
        success: true,
        message: 'Cliente eliminado exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en clienteService.deleteCliente:', error);
      throw error;
    }
  }
  
  // Restaurar cliente
  async restoreCliente(id) {
    try {
      const cliente = await Cliente.findByPk(id);
      
      if (!cliente) {
        return {
          success: false,
          message: 'Cliente no encontrado'
        };
      }
      
      await cliente.update({ estado: 'activo' });
      
      return {
        success: true,
        message: 'Cliente restaurado exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en clienteService.restoreCliente:', error);
      throw error;
    }
  }
  
  // Obtener estadísticas de clientes
  async getEstadisticas() {
    try {
      const [total, activos, inactivos] = await Promise.all([
        Cliente.count(),
        Cliente.count({ where: { estado: 'activo' } }),
        Cliente.count({ where: { estado: 'inactivo' } })
      ]);
      
      // Clientes por manager
      const clientesPorManager = await Cliente.findAll({
        attributes: [
          'usuarios_id',
          [Cliente.sequelize.fn('COUNT', Cliente.sequelize.col('clientes_id')), 'total']
        ],
        include: [{
          model: Usuario,
          as: 'manager',
          attributes: ['usuarios_id', 'nombre_completo', 'usuario']
        }],
        group: ['usuarios_id', 'manager.usuarios_id'],
        order: [[Cliente.sequelize.literal('total'), 'DESC']]
      });
      
      const estadisticas = {
        total,
        activos,
        inactivos,
        por_manager: clientesPorManager,
        porcentajes: {
          activos: total > 0 ? Math.round((activos / total) * 100) : 0,
          inactivos: total > 0 ? Math.round((inactivos / total) * 100) : 0
        }
      };
      
      return {
        success: true,
        estadisticas
      };
      
    } catch (error) {
      console.error('❌ Error en clienteService.getEstadisticas:', error);
      throw error;
    }
  }
  
  // Buscar clientes para autocompletado
  async searchClientes(searchTerm, limit = 10) {
    try {
      const clientes = await Cliente.findAll({
        where: {
          [Op.and]: [
            { estado: 'activo' },
            {
              [Op.or]: [
                { nombre_encargado: { [Op.like]: `%${searchTerm}%` } },
                { nombre_empresa: { [Op.like]: `%${searchTerm}%` } },
                { documento_fiscal: { [Op.like]: `%${searchTerm}%` } }
              ]
            }
          ]
        },
        attributes: [
          'clientes_id',
          'nombre_encargado',
          'nombre_empresa',
          'documento_fiscal'
        ],
        limit: parseInt(limit),
        order: [['nombre_empresa', 'ASC']]
      });
      
      return {
        success: true,
        clientes
      };
      
    } catch (error) {
      console.error('❌ Error en clienteService.searchClientes:', error);
      throw error;
    }
  }

  // Buscar clientes con filtros (incluye filtro de usuario para modales)
  async searchClientesWithFilters(filters = {}) {
    try {
      const whereConditions = {};
      
      // Solo aplicar filtro de búsqueda si hay término
      if (filters.search && filters.search.trim().length > 0) {
        whereConditions[Op.or] = [
          { nombre_encargado: { [Op.like]: `%${filters.search}%` } },
          { nombre_empresa: { [Op.like]: `%${filters.search}%` } },
          { documento_fiscal: { [Op.like]: `%${filters.search}%` } }
        ];
      }
      
      // Filtro por estado
      if (filters.estado) {
        whereConditions.estado = filters.estado;
      }
      
      // Filtro por usuarios_id (manager)
      if (filters.usuarios_id) {
        whereConditions.usuarios_id = filters.usuarios_id;
      }
      
      const options = {
        where: whereConditions,
        include: [{
          model: Usuario,
          as: 'manager',
          attributes: ['usuarios_id', 'nombre_completo', 'correo']
        }],
        limit: filters.limit || 10,
        order: [['nombre_empresa', 'ASC']]
      };
      
      const clientes = await Cliente.findAll(options);
      
      return {
        success: true,
        clientes: clientes.map(cliente => cliente.toJSON())
      };
      
    } catch (error) {
      console.error('❌ Service: Error buscando clientes:', error);
      throw error;
    }
  }
}

module.exports = new ClienteService();