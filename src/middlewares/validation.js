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
  // ==================== AUTH ====================
  // Login
  login: Joi.object({
    usuario: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.empty': 'El usuario es requerido',
        'string.min': 'El usuario debe tener al menos 3 caracteres',
        'string.max': 'El usuario no puede tener más de 100 caracteres'
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.empty': 'La contraseña es requerida',
        'string.min': 'La contraseña debe tener al menos 6 caracteres'
      })
  }),

  // ==================== USUARIOS ====================
  // Crear usuario
  createUsuario: Joi.object({
    nombre_completo: Joi.string()
      .min(2)
      .max(255)
      .required()
      .messages({
        'string.empty': 'El nombre completo es requerido',
        'string.min': 'El nombre completo debe tener al menos 2 caracteres',
        'string.max': 'El nombre completo no puede tener más de 255 caracteres'
      }),
    
    correo: Joi.string()
      .email()
      .max(191)
      .required()
      .messages({
        'string.email': 'Debe ser un correo electrónico válido',
        'string.empty': 'El correo es requerido',
        'string.max': 'El correo no puede tener más de 191 caracteres'
      }),
    
    usuario: Joi.string()
      .min(3)
      .max(100)
      .pattern(/^[a-zA-Z0-9_.-]+$/)
      .required()
      .messages({
        'string.empty': 'El nombre de usuario es requerido',
        'string.min': 'El usuario debe tener al menos 3 caracteres',
        'string.max': 'El usuario no puede tener más de 100 caracteres',
        'string.pattern.base': 'El usuario solo puede contener letras, números, puntos, guiones y guiones bajos'
      }),
    
    password: Joi.string()
      .min(6)
      .max(255)
      .required()
      .messages({
        'string.empty': 'La contraseña es requerida',
        'string.min': 'La contraseña debe tener al menos 6 caracteres',
        'string.max': 'La contraseña no puede tener más de 255 caracteres'
      }),
    
    tipo_usuario: Joi.string()
      .valid('admin', 'vendedor', 'super_usuario')
      .required()
      .messages({
        'any.only': 'El tipo de usuario debe ser: admin, vendedor o super_usuario',
        'string.empty': 'El tipo de usuario es requerido'
      }),
    
    telefono: Joi.string()
      .max(20)
      .allow('')
      .optional()
      .messages({
        'string.max': 'El teléfono no puede tener más de 20 caracteres'
      })
  }),

  // Actualizar usuario
  updateUsuario: Joi.object({
    nombre_completo: Joi.string()
      .min(2)
      .max(255)
      .optional()
      .messages({
        'string.min': 'El nombre completo debe tener al menos 2 caracteres',
        'string.max': 'El nombre completo no puede tener más de 255 caracteres'
      }),
    
    correo: Joi.string()
      .email()
      .max(191)
      .optional()
      .messages({
        'string.email': 'Debe ser un correo electrónico válido',
        'string.max': 'El correo no puede tener más de 191 caracteres'
      }),
    
    usuario: Joi.string()
      .min(3)
      .max(100)
      .pattern(/^[a-zA-Z0-9_.-]+$/)
      .optional()
      .messages({
        'string.min': 'El usuario debe tener al menos 3 caracteres',
        'string.max': 'El usuario no puede tener más de 100 caracteres',
        'string.pattern.base': 'El usuario solo puede contener letras, números, puntos, guiones y guiones bajos'
      }),
    
    password: Joi.string()
      .min(6)
      .max(255)
      .optional()
      .messages({
        'string.min': 'La contraseña debe tener al menos 6 caracteres',
        'string.max': 'La contraseña no puede tener más de 255 caracteres'
      }),
    
    tipo_usuario: Joi.string()
      .valid('admin', 'vendedor', 'super_usuario')
      .optional()
      .messages({
        'any.only': 'El tipo de usuario debe ser: admin, vendedor o super_usuario'
      }),
    
    telefono: Joi.string()
      .max(20)
      .allow('')
      .optional()
      .messages({
        'string.max': 'El teléfono no puede tener más de 20 caracteres'
      }),
    
    estado: Joi.string()
      .valid('activo', 'inactivo')
      .optional()
      .messages({
        'any.only': 'El estado debe ser: activo o inactivo'
      })
  }),

  // Cambiar contraseña
  changePassword: Joi.object({
    password_actual: Joi.string()
      .required()
      .messages({
        'string.empty': 'La contraseña actual es requerida'
      }),
    
    password_nuevo: Joi.string()
      .min(6)
      .max(255)
      .required()
      .messages({
        'string.empty': 'La nueva contraseña es requerida',
        'string.min': 'La nueva contraseña debe tener al menos 6 caracteres',
        'string.max': 'La nueva contraseña no puede tener más de 255 caracteres'
      })
  }),

  // ==================== USUARIOS LEGACY (para compatibilidad) ====================
  // Crear usuario (versión legacy)
  createUser: Joi.object({
    nombre_completo: Joi.string().min(2).max(255).required(),
    correo: Joi.string().email().max(191).required(),
    usuario: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(6).max(255).required(),
    tipo_usuario: Joi.string().valid('admin', 'vendedor', 'super_usuario').required(),
    telefono: Joi.string().max(20).optional()
  }),

  // Actualizar usuario (versión legacy)
  updateUser: Joi.object({
    nombre_completo: Joi.string().min(2).max(255).optional(),
    correo: Joi.string().email().max(191).optional(),
    telefono: Joi.string().max(20).optional(),
    password: Joi.string().min(6).max(255).optional(),
    estado: Joi.string().valid('activo', 'inactivo').optional()
  }),

  // ==================== CLIENTES ====================
  // Crear cliente
  createClient: Joi.object({
    nombre_encargado: Joi.string()
      .min(2)
      .max(255)
      .required()
      .messages({
        'string.empty': 'El nombre del encargado es requerido',
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 255 caracteres'
      }),
    
    telefono_personal: Joi.string()
      .max(20)
      .allow('')
      .optional()
      .messages({
        'string.max': 'El teléfono personal no puede tener más de 20 caracteres'
      }),
    
    telefono_empresa: Joi.string()
      .max(20)
      .allow('')
      .optional()
      .messages({
        'string.max': 'El teléfono de empresa no puede tener más de 20 caracteres'
      }),
    
    nombre_empresa: Joi.string()
      .min(2)
      .max(255)
      .required()
      .messages({
        'string.empty': 'El nombre de la empresa es requerido',
        'string.min': 'El nombre de empresa debe tener al menos 2 caracteres',
        'string.max': 'El nombre de empresa no puede tener más de 255 caracteres'
      }),
    
    documento_fiscal: Joi.string()
      .min(5)
      .max(50)
      .required()
      .messages({
        'string.empty': 'El documento fiscal es requerido',
        'string.min': 'El documento fiscal debe tener al menos 5 caracteres',
        'string.max': 'El documento fiscal no puede tener más de 50 caracteres'
      }),
    
    correo_personal: Joi.string()
      .email()
      .max(191)
      .allow('')
      .optional()
      .messages({
        'string.email': 'Debe ser un correo electrónico válido',
        'string.max': 'El correo personal no puede tener más de 191 caracteres'
      }),
    
    correo_empresa: Joi.string()
      .email()
      .max(191)
      .allow('')
      .optional()
      .messages({
        'string.email': 'Debe ser un correo electrónico válido',
        'string.max': 'El correo de empresa no puede tener más de 191 caracteres'
      })
  }),

  // Actualizar cliente
  updateClient: Joi.object({
    nombre_encargado: Joi.string()
      .min(2)
      .max(255)
      .optional()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 255 caracteres'
      }),
    
    telefono_personal: Joi.string()
      .max(20)
      .allow('')
      .optional()
      .messages({
        'string.max': 'El teléfono personal no puede tener más de 20 caracteres'
      }),
    
    telefono_empresa: Joi.string()
      .max(20)
      .allow('')
      .optional()
      .messages({
        'string.max': 'El teléfono de empresa no puede tener más de 20 caracteres'
      }),
    
    nombre_empresa: Joi.string()
      .min(2)
      .max(255)
      .optional()
      .messages({
        'string.min': 'El nombre de empresa debe tener al menos 2 caracteres',
        'string.max': 'El nombre de empresa no puede tener más de 255 caracteres'
      }),
    
    documento_fiscal: Joi.string()
      .min(5)
      .max(50)
      .optional()
      .messages({
        'string.min': 'El documento fiscal debe tener al menos 5 caracteres',
        'string.max': 'El documento fiscal no puede tener más de 50 caracteres'
      }),
    
    correo_personal: Joi.string()
      .email()
      .max(191)
      .allow('')
      .optional()
      .messages({
        'string.email': 'Debe ser un correo electrónico válido',
        'string.max': 'El correo personal no puede tener más de 191 caracteres'
      }),
    
    correo_empresa: Joi.string()
      .email()
      .max(191)
      .allow('')
      .optional()
      .messages({
        'string.email': 'Debe ser un correo electrónico válido',
        'string.max': 'El correo de empresa no puede tener más de 191 caracteres'
      })
  }),

  // ==================== SERVICIOS ====================
  // Crear servicio
  createService: Joi.object({
    nombre: Joi.string()
      .min(2)
      .max(255)
      .required()
      .messages({
        'string.empty': 'El nombre del servicio es requerido',
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 255 caracteres'
      }),
    
    categorias_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'La categoría debe ser un número',
        'number.integer': 'La categoría debe ser un número entero',
        'number.positive': 'La categoría debe ser un número positivo'
      }),
    
    descripcion: Joi.string()
      .allow('')
      .optional()
      .messages({
        'string.base': 'La descripción debe ser texto'
      }),
    
    precio_minimo: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.base': 'El precio mínimo debe ser un número',
        'number.positive': 'El precio mínimo debe ser mayor a 0',
        'any.required': 'El precio mínimo es requerido'
      }),
    
    precio_recomendado: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.base': 'El precio recomendado debe ser un número',
        'number.positive': 'El precio recomendado debe ser mayor a 0',
        'any.required': 'El precio recomendado es requerido'
      })
  }),

  // Actualizar servicio
  updateService: Joi.object({
    nombre: Joi.string()
      .min(2)
      .max(255)
      .optional()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 255 caracteres'
      }),
    
    categorias_id: Joi.number()
      .integer()
      .positive()
      .allow(null)
      .optional()
      .messages({
        'number.base': 'La categoría debe ser un número',
        'number.integer': 'La categoría debe ser un número entero',
        'number.positive': 'La categoría debe ser un número positivo'
      }),
    
    descripcion: Joi.string()
      .allow('')
      .optional()
      .messages({
        'string.base': 'La descripción debe ser texto'
      }),
    
    precio_minimo: Joi.number()
      .positive()
      .precision(2)
      .optional()
      .messages({
        'number.base': 'El precio mínimo debe ser un número',
        'number.positive': 'El precio mínimo debe ser mayor a 0'
      }),
    
    precio_recomendado: Joi.number()
      .positive()
      .precision(2)
      .optional()
      .messages({
        'number.base': 'El precio recomendado debe ser un número',
        'number.positive': 'El precio recomendado debe ser mayor a 0'
      })
  }),

  // ==================== CATEGORÍAS ====================
  // Crear categoría
  createCategory: Joi.object({
    nombre: Joi.string()
      .min(2)
      .max(255)
      .required()
      .messages({
        'string.empty': 'El nombre de la categoría es requerido',
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 255 caracteres'
      }),
    
    descripcion: Joi.string()
      .allow('')
      .optional()
      .messages({
        'string.base': 'La descripción debe ser texto'
      })
  }),

  // Actualizar categoría
  updateCategory: Joi.object({
    nombre: Joi.string()
      .min(2)
      .max(255)
      .optional()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 255 caracteres'
      }),
    
    descripcion: Joi.string()
      .allow('')
      .optional()
      .messages({
        'string.base': 'La descripción debe ser texto'
      })
  }),

  // ==================== COTIZACIONES ====================
  // Crear cotización
  createQuote: Joi.object({
    clientes_id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'El cliente debe ser un número',
        'number.integer': 'El cliente debe ser un número entero',
        'number.positive': 'Debe seleccionar un cliente válido',
        'any.required': 'El cliente es requerido'
      }),
    
    servicios: Joi.array()
      .items(
        Joi.object({
          servicios_id: Joi.number()
            .integer()
            .positive()
            .required()
            .messages({
              'number.base': 'El servicio debe ser un número',
              'number.integer': 'El servicio debe ser un número entero',
              'number.positive': 'Debe seleccionar un servicio válido',
              'any.required': 'El servicio es requerido'
            }),
          
          cantidad_equipos: Joi.number()
            .integer()
            .min(0)
            .default(0)
            .messages({
              'number.base': 'La cantidad de equipos debe ser un número',
              'number.integer': 'La cantidad de equipos debe ser un número entero',
              'number.min': 'La cantidad de equipos no puede ser negativa'
            }),
          
          cantidad_servicios: Joi.number()
            .integer()
            .min(0)
            .default(0)
            .messages({
              'number.base': 'La cantidad de servicios debe ser un número',
              'number.integer': 'La cantidad de servicios debe ser un número entero',
              'number.min': 'La cantidad de servicios no puede ser negativa'
            }),
          
          cantidad_gb: Joi.number()
            .integer()
            .min(0)
            .default(0)
            .messages({
              'number.base': 'La cantidad de GB debe ser un número',
              'number.integer': 'La cantidad de GB debe ser un número entero',
              'number.min': 'La cantidad de GB no puede ser negativa'
            }),
          
          precio_usado: Joi.number()
            .positive()
            .precision(2)
            .required()
            .messages({
              'number.base': 'El precio debe ser un número',
              'number.positive': 'El precio debe ser mayor a 0',
              'any.required': 'El precio es requerido'
            })
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'Debe incluir al menos un servicio',
        'any.required': 'Los servicios son requeridos'
      }),
    
    comentario: Joi.string()
      .allow('')
      .optional()
      .messages({
        'string.base': 'El comentario debe ser texto'
      }),
    
    incluir_nombre_encargado: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'Debe ser verdadero o falso'
      }),
    
    incluir_nombre_empresa: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'Debe ser verdadero o falso'
      }),
    
    incluir_documento_fiscal: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'Debe ser verdadero o falso'
      }),
    
    incluir_telefono_empresa: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'Debe ser verdadero o falso'
      }),
    
    incluir_correo_empresa: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'Debe ser verdadero o falso'
      }),
    
    tipo_precio_pdf: Joi.string()
      .valid('minimo', 'venta')
      .default('venta')
      .messages({
        'any.only': 'El tipo de precio debe ser: minimo o venta'
      })
  }),

  // Actualizar cotización
  updateQuote: Joi.object({
    clientes_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'El cliente debe ser un número',
        'number.integer': 'El cliente debe ser un número entero',
        'number.positive': 'Debe seleccionar un cliente válido'
      }),
    
    comentario: Joi.string()
      .allow('')
      .optional()
      .messages({
        'string.base': 'El comentario debe ser texto'
      }),
    
    estado: Joi.string()
      .valid('pendiente', 'aprobada', 'rechazada', 'expirada')
      .optional()
      .messages({
        'any.only': 'El estado debe ser: pendiente, aprobada, rechazada o expirada'
      })
  })
};

module.exports = {
  validate,
  schemas
};