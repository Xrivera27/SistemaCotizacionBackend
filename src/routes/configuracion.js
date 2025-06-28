const express = require('express');
const { validate, schemas } = require('../middlewares/validation');
const { authenticateToken } = require('../middlewares/auth');
const configuracionController = require('../controllers/configuracionController');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Rutas de configuración personal (accesibles por todos los usuarios autenticados)
router.get('/perfil', configuracionController.getInformacionPersonal);
router.put('/perfil', validate(schemas.updateInformacionPersonal), configuracionController.actualizarInformacionPersonal);
router.patch('/cambiar-password', validate(schemas.cambiarContrasena), configuracionController.cambiarContrasena);

module.exports = router;