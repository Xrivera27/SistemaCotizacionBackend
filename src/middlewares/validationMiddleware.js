// middlewares/validationMiddleware.js
const { validationResult } = require('express-validator');

const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.log('❌ Errores de validación:', errors.array());
    
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array().map(error => ({
        campo: error.path || error.param,
        mensaje: error.msg,
        valor: error.value
      }))
    });
  }
  
  // Pasar los datos validados al siguiente middleware
  req.validatedData = req.body;
  next();
};

module.exports = validationMiddleware;