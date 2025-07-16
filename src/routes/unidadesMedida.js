const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdminOrSuper } = require('../middlewares/authorization');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

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
      data: { unidades }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener todas las unidades de medida (solo admin o super)
router.get('/', requireAdminOrSuper, async (req, res) => {
  try {
    const { UnidadMedida } = require('../models');
    
    const unidades = await UnidadMedida.findAll({
      order: [['tipo', 'ASC'], ['nombre', 'ASC']]
    });
    
    res.json({
      success: true,
      data: { unidades }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;