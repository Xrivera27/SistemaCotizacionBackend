const Joi = require('joi');

// Middleware para validar datos con Joi
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors
      });
    }

    req.validatedData = value;
    next();
  };
};

// Esquemas de validación
const schemas = {
  // Login
  login: Joi.object({
    usuario: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(6).required()
  }),

  // Crear usuario
  createUser: Joi.object({
    nombre_completo: Joi.string().min(2).max(255).required(),
    correo: Joi.string().email().max(191).required(),
    usuario: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(6).max(255).required(),
    tipo_usuario: Joi.string().valid('admin', 'vendedor', 'super_usuario').required(),
    telefono: Joi.string().max(20).optional()
  }),

  // Actualizar usuario
  updateUser: Joi.object({
    nombre_completo: Joi.string().min(2).max(255).optional(),
    correo: Joi.string().email().max(191).optional(),
    telefono: Joi.string().max(20).optional(),
    password: Joi.string().min(6).max(255).optional(),
    estado: Joi.string().valid('activo', 'inactivo').optional()
  }),

  // Crear cliente
  createClient: Joi.object({
    nombre_encargado: Joi.string().min(2).max(255).required(),
    telefono_personal: Joi.string().max(20).optional(),
    telefono_empresa: Joi.string().max(20).optional(),
    nombre_empresa: Joi.string().min(2).max(255).required(),
    documento_fiscal: Joi.string().min(5).max(50).required(),
    correo_personal: Joi.string().email().max(191).optional(),
    correo_empresa: Joi.string().email().max(191).optional()
  }),

  // Crear servicio
  createService: Joi.object({
    nombre: Joi.string().min(2).max(255).required(),
    categorias_id: Joi.number().integer().positive().optional(),
    descripcion: Joi.string().optional(),
    precio_minimo: Joi.number().positive().precision(2).required(),
    precio_recomendado: Joi.number().positive().precision(2).required()
  }),

  // Crear cotización
  createQuote: Joi.object({
    clientes_id: Joi.number().integer().positive().required(),
    servicios: Joi.array().items(
      Joi.object({
        servicios_id: Joi.number().integer().positive().required(),
        cantidad_equipos: Joi.number().integer().min(0).default(0),
        cantidad_servicios: Joi.number().integer().min(0).default(0),
        cantidad_gb: Joi.number().integer().min(0).default(0),
        precio_usado: Joi.number().positive().precision(2).required()
      })
    ).min(1).required(),
    comentario: Joi.string().optional(),
    incluir_nombre_encargado: Joi.boolean().default(false),
    incluir_nombre_empresa: Joi.boolean().default(false),
    incluir_documento_fiscal: Joi.boolean().default(false),
    incluir_telefono_empresa: Joi.boolean().default(false),
    incluir_correo_empresa: Joi.boolean().default(false),
    tipo_precio_pdf: Joi.string().valid('minimo', 'venta').default('venta')
  })
};

module.exports = {
  validate,
  schemas
};