const clienteService = require('../services/clienteService');

class ClienteController {
  
  // Obtener todos los clientes con paginación y filtros
  async getClientes(req, res) {
    try {
      const filters = { ...req.query };
      
      // TODOS los usuarios solo ven sus propios clientes
      filters.usuarios_id = req.user.id;
      
      const result = await clienteService.getClientes(filters);
      
      res.json({
        success: true,
        data: {
          clientes: result.clientes,
          pagination: result.pagination
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener cliente por ID
  async getClienteById(req, res) {
    try {
      const { id } = req.params;
      
      const result = await clienteService.getClienteById(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      // TODOS los usuarios solo pueden ver sus clientes
      if (result.cliente.usuarios_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este cliente'
        });
      }
      
      res.json({
        success: true,
        data: { cliente: result.cliente }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Crear cliente (COTIZACIONES)
  async createCliente(req, res) {
    try {
      // ASIGNAR usuario actual como manager (comportamiento original)
      req.validatedData.usuarios_id = req.user.id;
      
      const result = await clienteService.createCliente(req.validatedData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json({
        success: true,
        message: result.message,
        data: { cliente: result.cliente }
      });
      
    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      
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
  
  // Actualizar cliente
  async updateCliente(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar que el cliente existe
      const clienteCheck = await clienteService.getClienteById(id);
      if (!clienteCheck.success) {
        return res.status(404).json(clienteCheck);
      }
      
      // Verificar permisos para cambiar manager
      if (req.validatedData.usuarios_id && req.validatedData.usuarios_id !== clienteCheck.cliente.usuarios_id) {
        // Solo admin y super_usuario pueden cambiar manager
        if (req.user.tipo_usuario === 'vendedor') {
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para cambiar el manager de este cliente'
          });
        }
      }
      
      // Verificar que el usuario actual puede editar este cliente
      if (req.user.tipo_usuario === 'vendedor' && clienteCheck.cliente.usuarios_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para editar este cliente'
        });
      }
      
      const result = await clienteService.updateCliente(id, req.validatedData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json({
        success: true,
        message: result.message,
        data: { cliente: result.cliente }
      });
      
    } catch (error) {
      console.error('❌ Error actualizando cliente:', error);
      
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
  
  // Eliminar cliente (soft delete)
  async deleteCliente(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar que el cliente existe y permisos
      const clienteCheck = await clienteService.getClienteById(id);
      if (!clienteCheck.success) {
        return res.status(404).json(clienteCheck);
      }
      
      // TODOS los usuarios solo pueden eliminar sus clientes
      if (clienteCheck.cliente.usuarios_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar este cliente'
        });
      }
      
      const result = await clienteService.deleteCliente(id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error eliminando cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Restaurar cliente
  async restoreCliente(req, res) {
    try {
      const { id } = req.params;
      
      const result = await clienteService.restoreCliente(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error restaurando cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener estadísticas de clientes
  async getEstadisticas(req, res) {
    try {
      const result = await clienteService.getEstadisticas();
      
      res.json({
        success: true,
        data: { estadisticas: result.estadisticas }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Buscar clientes para autocompletado (SIN filtros - para uso administrativo)
  async searchClientes(req, res) {
    try {
      const { q, limit = 10 } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.json({
          success: true,
          data: { clientes: [] }
        });
      }
      
      const result = await clienteService.searchClientes(q.trim(), limit);
      
      res.json({
        success: true,
        data: { clientes: result.clientes }
      });
      
    } catch (error) {
      console.error('❌ Error buscando clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Búsqueda de clientes para modales - TODOS ven solo sus clientes
  async searchClientesModal(req, res) {
    try {
      const { q, limit = 10 } = req.query;
      
      // Permitir búsquedas vacías
      if (q && q.trim().length > 0 && q.trim().length < 2) {
        return res.json({
          success: true,
          data: { clientes: [] }
        });
      }

      // TODOS los usuarios solo ven sus propios clientes
      const filters = {
        search: q ? q.trim() : '',
        limit: parseInt(limit),
        estado: 'activo',
        usuarios_id: req.user.id  // SIEMPRE aplicar filtro por usuario
      };
      
      const result = await clienteService.searchClientesWithFilters(filters);
      
      res.json({
        success: true,
        data: { clientes: result.clientes }
      });
      
    } catch (error) {
      console.error('❌ Error buscando clientes para modal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener TODOS los clientes para administración (sin filtros de usuario)
  async getClientesAdmin(req, res) {
    try {
      const filters = { ...req.query };
      
      // NO aplicar filtro de usuario - mostrar TODOS los clientes
      const result = await clienteService.getClientes(filters);
      
      res.json({
        success: true,
        data: {
          clientes: result.clientes,
          pagination: result.pagination
        }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo clientes admin:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear cliente desde administración (con selección de manager)
  async createClienteAdmin(req, res) {
    try {
      // Validar que se seleccionó un manager
      if (!req.validatedData.usuarios_id) {
        return res.status(400).json({
          success: false,
          message: 'Debe seleccionar un manager para el cliente'
        });
      }
      
      const result = await clienteService.createCliente(req.validatedData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json({
        success: true,
        message: result.message,
        data: { cliente: result.cliente }
      });
      
    } catch (error) {
      console.error('❌ Error creando cliente admin:', error);
      
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
}

module.exports = new ClienteController();