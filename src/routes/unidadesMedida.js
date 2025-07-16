// routes/unidadesMedida.js

const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdminOrSuper } = require('../middlewares/authorization');
const unidadesMedidaController = require('../controllers/unidadesMedidaController');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// ==================== RUTAS EXISTENTES (MANTENIDAS) ====================

// Obtener unidades de medida activas (todos los usuarios autenticados)
router.get('/activas', async (req, res) => {
  try {
    const { UnidadMedida } = require('../models');
    
    const unidades = await UnidadMedida.findAll({
      where: { activo: true },
      attributes: [
        'unidades_medida_id',
        'nombre', 
        'abreviacion',
        'tipo',
        'descripcion'
      ],
      order: [['tipo', 'ASC'], ['nombre', 'ASC']]
    });
    
    res.json({
      success: true,
      data: unidades
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ==================== NUEVAS RUTAS ADMINISTRATIVAS ====================

// 📊 Obtener estadísticas (debe ir antes que /:id)
router.get('/estadisticas', 
  requireAdminOrSuper, 
  unidadesMedidaController.getEstadisticas
);

// 🔍 Buscar unidades (debe ir antes que /:id)
router.get('/search', 
  unidadesMedidaController.buscarUnidades
);

// Obtener todas las unidades de medida con filtros y paginación (solo admin o super)
router.get('/', requireAdminOrSuper, unidadesMedidaController.getUnidades);

// 👀 Obtener unidad por ID
router.get('/:id', 
  requireAdminOrSuper, 
  unidadesMedidaController.getUnidadById
);

// ✨ Crear nueva unidad (solo admin y super)
router.post('/', 
  requireAdminOrSuper, 
  unidadesMedidaController.createUnidad
);

// ✏️ Actualizar unidad (solo admin y super)
router.put('/:id', 
  requireAdminOrSuper, 
  unidadesMedidaController.updateUnidad
);

// 🗑️ Desactivar unidad (solo admin y super)
router.delete('/:id', 
  requireAdminOrSuper, 
  unidadesMedidaController.deleteUnidad
);

// 🔄 Reactivar unidad (solo admin y super)
router.post('/:id/restore', 
  requireAdminOrSuper, 
  unidadesMedidaController.restoreUnidad
);

module.exports = router;