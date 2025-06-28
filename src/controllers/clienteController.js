const clienteService = require('../services/clienteService');

class ClienteController {
  
  // Obtener todos los clientes con paginación y filtros
  async getClientes(req, res) {
    try {
      console.log('=== GET CLIENTES ===');
      console.log('Query params:', req.query);
      console.log('Usuario:', req.user);
      
      const filters = { ...req.query };
      
      // ✅ CORREGIDO: TODOS los usuarios solo ven sus propios clientes
      filters.usuarios_id = req.user.id;
      
      const result = await clienteService.getClientes(filters);
      
      console.log(`✅ Clientes encontrados: ${result.pagination.totalItems}`);
      
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
      console.log('=== GET CLIENTE BY ID ===');
      const { id } = req.params;
      console.log('ID solicitado:', id);
      
      const result = await clienteService.getClienteById(id);
      
      if (!result.success) {
        console.log('❌ Cliente no encontrado');
        return res.status(404).json(result);
      }
      
      // ✅ CORREGIDO: TODOS los usuarios solo pueden ver sus clientes
      if (result.cliente.usuarios_id !== req.user.id) {
        console.log('❌ Usuario intentando acceder a cliente ajeno');
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este cliente'
        });
      }
      
      console.log('✅ Cliente encontrado:', result.cliente.nombre_empresa);
      
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
  
  // Crear nuevo cliente
  async createCliente(req, res) {
    try {
      console.log('=== CREATE CLIENTE ===');
      console.log('Datos recibidos:', req.validatedData);
      console.log('Usuario creador:', req.user);
      
      // ✅ CORREGIDO: SIEMPRE asignar el usuario actual como manager
      req.validatedData.usuarios_id = req.user.id;
      
      const result = await clienteService.createCliente(req.validatedData);
      
      if (!result.success) {
        console.log('❌ Error creando cliente:', result.message);
        return res.status(400).json(result);
      }
      
      console.log('✅ Cliente creado exitosamente:', result.cliente.nombre_empresa);
      
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
      console.log('=== UPDATE CLIENTE ===');
      const { id } = req.params;
      console.log('ID a actualizar:', id);
      console.log('Datos recibidos:', req.validatedData);
      
      // Verificar que el cliente existe y permisos
      const clienteCheck = await clienteService.getClienteById(id);
      if (!clienteCheck.success) {
        return res.status(404).json(clienteCheck);
      }
      
      // ✅ CORREGIDO: TODOS los usuarios solo pueden editar sus clientes
      if (clienteCheck.cliente.usuarios_id !== req.user.id) {
        console.log('❌ Usuario intentando editar cliente ajeno');
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para editar este cliente'
        });
      }
      
      // ✅ CORREGIDO: No permitir cambiar el manager
      delete req.validatedData.usuarios_id;
      
      const result = await clienteService.updateCliente(id, req.validatedData);
      
      if (!result.success) {
        console.log('❌ Error actualizando cliente:', result.message);
        return res.status(400).json(result);
      }
      
      console.log('✅ Cliente actualizado exitosamente');
      
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
      console.log('=== DELETE CLIENTE ===');
      const { id } = req.params;
      console.log('ID a eliminar:', id);
      
      // Verificar que el cliente existe y permisos
      const clienteCheck = await clienteService.getClienteById(id);
      if (!clienteCheck.success) {
        return res.status(404).json(clienteCheck);
      }
      
      // ✅ CORREGIDO: TODOS los usuarios solo pueden eliminar sus clientes
      if (clienteCheck.cliente.usuarios_id !== req.user.id) {
        console.log('❌ Usuario intentando eliminar cliente ajeno');
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar este cliente'
        });
      }
      
      const result = await clienteService.deleteCliente(id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      console.log('✅ Cliente eliminado exitosamente');
      
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
      console.log('=== RESTORE CLIENTE ===');
      const { id } = req.params;
      console.log('ID a restaurar:', id);
      
      const result = await clienteService.restoreCliente(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      console.log('✅ Cliente restaurado exitosamente');
      
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
      console.log('=== GET ESTADISTICAS CLIENTES ===');
      
      const result = await clienteService.getEstadisticas();
      
      console.log('✅ Estadísticas calculadas:', result.estadisticas);
      
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
      console.log('=== SEARCH CLIENTES ===');
      const { q, limit = 10 } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.json({
          success: true,
          data: { clientes: [] }
        });
      }
      
      const result = await clienteService.searchClientes(q.trim(), limit);
      
      console.log(`✅ Clientes encontrados para búsqueda: ${result.clientes.length}`);
      
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

  // ✅ CORREGIDO: Búsqueda de clientes para modales - TODOS ven solo sus clientes
  async searchClientesModal(req, res) {
    try {
      console.log('=== SEARCH CLIENTES MODAL ===');
      const { q, limit = 10 } = req.query;
      console.log('Usuario buscando:', req.user.usuario, '- Tipo:', req.user.tipo_usuario, '- ID:', req.user.id);
      console.log('Término de búsqueda:', q);
      
      // ✅ CORREGIDO: Permitir búsquedas vacías
      if (q && q.trim().length > 0 && q.trim().length < 2) {
        return res.json({
          success: true,
          data: { clientes: [] }
        });
      }

      // ✅ CORREGIDO: TODOS los usuarios solo ven sus propios clientes
      const filters = {
        search: q ? q.trim() : '',
        limit: parseInt(limit),
        estado: 'activo',
        usuarios_id: req.user.id  // ✅ SIEMPRE aplicar filtro por usuario
      };

      console.log('🔒 Filtro aplicado - usuarios_id:', req.user.id);
      console.log('Filtros aplicados:', filters);
      
      const result = await clienteService.searchClientesWithFilters(filters);
      
      console.log(`✅ Clientes encontrados: ${result.clientes.length}`);
      
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
}

module.exports = new ClienteController();