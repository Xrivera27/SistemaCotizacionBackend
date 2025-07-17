// middlewares/validation.js (versión completa corregida)
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

// NUEVO: Forgot Password
forgotPassword: Joi.object({
  email: Joi.string()
    .email()
    .max(191)
    .required()
    .messages({
      'string.email': 'Debe ser un correo electrónico válido',
      'string.empty': 'El email es requerido',
      'string.max': 'El email no puede tener más de 191 caracteres'
    })
}),
  // ==================== CONFIGURACIÓN DE USUARIO ====================
  // Actualizar información personal
  updateInformacionPersonal: Joi.object({
    nombre: Joi.string()
      .min(2)
      .max(255)
      .optional()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 255 caracteres'
      }),
    
    email: Joi.string()
      .email()
      .max(191)
      .optional()
      .messages({
        'string.email': 'Debe ser un correo electrónico válido',
        'string.max': 'El email no puede tener más de 191 caracteres'
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
    
    telefono: Joi.string()
      .pattern(/^(\+504\s?)?[0-9]{4}-?[0-9]{4}$/)
      .max(20)
      .allow('')
      .optional()
      .messages({
        'string.pattern.base': 'Formato de teléfono inválido. Usa el formato: +504 0000-0000',
        'string.max': 'El teléfono no puede tener más de 20 caracteres'
      })
  }),

  // Cambiar contraseña para configuración
  cambiarContrasena: Joi.object({
    actual: Joi.string()
      .required()
      .messages({
        'string.empty': 'La contraseña actual es requerida'
      }),
    
    nueva: Joi.string()
      .min(6)
      .max(255)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      .required()
      .messages({
        'string.empty': 'La nueva contraseña es requerida',
        'string.min': 'La nueva contraseña debe tener al menos 6 caracteres',
        'string.max': 'La nueva contraseña no puede tener más de 255 caracteres',
        'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
      }),
    
    confirmar: Joi.string()
      .valid(Joi.ref('nueva'))
      .required()
      .messages({
        'any.only': 'Las contraseñas no coinciden',
        'string.empty': 'La confirmación de contraseña es requerida'
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
  .max(20)  // ✅ CAMBIO: De 50 a 20
  .required()
  .messages({
    'string.empty': 'El documento fiscal es requerido',
    'string.min': 'El documento fiscal debe tener al menos 5 caracteres',
    'string.max': 'El documento fiscal no puede tener más de 20 caracteres'
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
      }),

    usuarios_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'El manager debe ser un número',
        'number.integer': 'El manager debe ser un número entero',
        'number.positive': 'Debe seleccionar un manager válido'
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
      }),

    usuarios_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'El manager debe ser un número',
        'number.integer': 'El manager debe ser un número entero',
        'number.positive': 'Debe seleccionar un manager válido'
      }),

    estado: Joi.string()
      .valid('activo', 'inactivo')
      .optional()
      .messages({
        'any.only': 'El estado debe ser: activo o inactivo'
      })
  }),

  // ==================== SERVICIOS (ACTUALIZADO PARA MÚLTIPLES CATEGORÍAS) ====================
  // Crear servicio con múltiples categorías
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
    
    // MANTENER COMPATIBILIDAD: categorias_id sigue siendo requerido como categoría principal
    categorias_id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'La categoría principal debe ser un número',
        'number.integer': 'La categoría principal debe ser un número entero',
        'number.positive': 'La categoría principal debe ser un número positivo',
        'any.required': 'La categoría principal es requerida'
      }),

    // NUEVO: Array de categorías (opcional, si no se proporciona usa solo la principal)
    categorias: Joi.array()
      .items(
        Joi.number()
          .integer()
          .positive()
          .messages({
            'number.base': 'Cada categoría debe ser un número',
            'number.integer': 'Cada categoría debe ser un número entero',
            'number.positive': 'Cada categoría debe ser un número positivo'
          })
      )
      .min(1)
      .max(10)
      .unique()
      .optional()
      .messages({
        'array.min': 'Debe seleccionar al menos una categoría',
        'array.max': 'No puede seleccionar más de 10 categorías',
        'array.unique': 'No puede repetir categorías'
      }),

    // NUEVO: Categoría principal (para cuando se usa el array de categorías)
    categoria_principal: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'La categoría principal debe ser un número',
        'number.integer': 'La categoría principal debe ser un número entero',
        'number.positive': 'La categoría principal debe ser un número positivo'
      }),
    
    descripcion: Joi.string()
      .max(1000)
      .allow('')
      .optional()
      .messages({
        'string.base': 'La descripción debe ser texto',
        'string.max': 'La descripción no puede tener más de 1000 caracteres'
      }),
    
    precio_minimo: Joi.number()
      .positive()
      .precision(2)
      .max(999999.99)
      .required()
      .messages({
        'number.base': 'El precio mínimo debe ser un número',
        'number.positive': 'El precio mínimo debe ser mayor a 0',
        'number.max': 'El precio mínimo no puede ser mayor a $999,999.99',
        'any.required': 'El precio mínimo es requerido'
      }),
    
    precio_recomendado: Joi.number()
      .positive()
      .precision(2)
      .max(999999.99)
      .min(Joi.ref('precio_minimo'))
      .required()
      .messages({
        'number.base': 'El precio recomendado debe ser un número',
        'number.positive': 'El precio recomendado debe ser mayor a 0',
        'number.max': 'El precio recomendado no puede ser mayor a $999,999.99',
        'number.min': 'El precio recomendado debe ser mayor o igual al precio mínimo',
        'any.required': 'El precio recomendado es requerido'
      })
  }),

  // 🔧 CORREGIDO: Actualizar servicio con múltiples categorías
  updateService: Joi.object({
    nombre: Joi.string()
      .min(2)
      .max(255)
      .optional()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 255 caracteres'
      }),
    
    // MANTENER COMPATIBILIDAD: categorias_id opcional para actualizaciones
    categorias_id: Joi.number()
      .integer()
      .positive()
      .allow(null)
      .optional()
      .messages({
        'number.base': 'La categoría principal debe ser un número',
        'number.integer': 'La categoría principal debe ser un número entero',
        'number.positive': 'La categoría principal debe ser un número positivo'
      }),

    // NUEVO: Array de categorías para actualización
    categorias: Joi.array()
      .items(
        Joi.number()
          .integer()
          .positive()
          .messages({
            'number.base': 'Cada categoría debe ser un número',
            'number.integer': 'Cada categoría debe ser un número entero',
            'number.positive': 'Cada categoría debe ser un número positivo'
          })
      )
      .min(1)
      .max(10)
      .unique()
      .optional()
      .messages({
        'array.min': 'Debe seleccionar al menos una categoría',
        'array.max': 'No puede seleccionar más de 10 categorías',
        'array.unique': 'No puede repetir categorías'
      }),

    // NUEVO: Categoría principal para actualización
    categoria_principal: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'La categoría principal debe ser un número',
        'number.integer': 'La categoría principal debe ser un número entero',
        'number.positive': 'La categoría principal debe ser un número positivo'
      }),
    
    descripcion: Joi.string()
      .max(1000)
      .allow('')
      .optional()
      .messages({
        'string.base': 'La descripción debe ser texto',
        'string.max': 'La descripción no puede tener más de 1000 caracteres'
      }),
    
    precio_minimo: Joi.number()
      .positive()
      .precision(2)
      .max(999999.99)
      .optional()
      .messages({
        'number.base': 'El precio mínimo debe ser un número',
        'number.positive': 'El precio mínimo debe ser mayor a 0',
        'number.max': 'El precio mínimo no puede ser mayor a $999,999.99'
      }),
    
    // 🔧 CORREGIDO: El problema estaba aquí
    precio_recomendado: Joi.number()
      .positive()
      .precision(2)
      .max(999999.99)
      .optional()
      .when('precio_minimo', {
        is: Joi.number(),
        then: Joi.number().min(Joi.ref('precio_minimo')), // 🔧 CORREGIDO: Joi.number().min() en lugar de Joi.min()
        otherwise: Joi.number().optional()
      })
      .messages({
        'number.base': 'El precio recomendado debe ser un número',
        'number.positive': 'El precio recomendado debe ser mayor a 0',
        'number.max': 'El precio recomendado no puede ser mayor a $999,999.99',
        'number.min': 'El precio recomendado debe ser mayor o igual al precio mínimo'
      }),
    
    estado: Joi.string()
      .valid('activo', 'inactivo')
      .optional()
      .messages({
        'any.only': 'El estado debe ser: activo o inactivo'
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
      }),

    // NUEVO: Campo unidades_medida_id
    unidades_medida_id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'La unidad de medida debe ser un número',
        'number.integer': 'La unidad de medida debe ser un número entero',
        'number.positive': 'Debe seleccionar una unidad de medida válida',
        'any.required': 'La unidad de medida es requerida'
      })
  }),

  // Actualizar categoría
  updateCategory: Joi.object({
    nombre: Joi.string()
      .min(2)
      .max(100)
      .optional()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 100 caracteres'
      }),
    
    descripcion: Joi.string()
      .allow('')
      .optional()
      .messages({
        'string.base': 'La descripción debe ser texto'
      }),

    // NUEVO: Campo unidades_medida_id para actualización
    unidades_medida_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'La unidad de medida debe ser un número',
        'number.integer': 'La unidad de medida debe ser un número entero',
        'number.positive': 'Debe seleccionar una unidad de medida válida'
      }),
    
    estado: Joi.string()
      .valid('activo', 'inactivo')
      .optional()
      .messages({
        'any.only': 'El estado debe ser: activo o inactivo'
      })
  }),

  // ==================== COTIZACIONES ====================
  // Crear cotización desde frontend (formato complejo)
// En middlewares/validation.js - SOLO EL ESQUEMA createCotizacionVendedor CORREGIDO:

createCotizacionVendedor: Joi.object({
  cliente: Joi.object({
    clientes_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'El ID del cliente debe ser un número',
        'number.integer': 'El ID del cliente debe ser un número entero',
        'number.positive': 'El ID del cliente debe ser positivo'
      }),
    
    nombreEncargado: Joi.string()
      .min(2)
      .max(255)
      .required()
      .messages({
        'string.empty': 'El nombre del encargado es requerido',
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 255 caracteres'
      }),
    
    telefonoPersonal: Joi.string()
      .max(20)
      .allow('')
      .optional()
      .messages({
        'string.max': 'El teléfono personal no puede tener más de 20 caracteres'
      }),
    
    telefonoEmpresa: Joi.string()
      .max(20)
      .allow('')
      .optional()
      .messages({
        'string.max': 'El teléfono de empresa no puede tener más de 20 caracteres'
      }),
    
    nombreEmpresa: Joi.string()
      .min(2)
      .max(255)
      .required()
      .messages({
        'string.empty': 'El nombre de la empresa es requerido',
        'string.min': 'El nombre de empresa debe tener al menos 2 caracteres',
        'string.max': 'El nombre de empresa no puede tener más de 255 caracteres'
      }),
    
    documentofiscal: Joi.string()
      .min(5)
      .max(50)
      .required()
      .messages({
        'string.empty': 'El documento fiscal es requerido',
        'string.min': 'El documento fiscal debe tener al menos 5 caracteres',
        'string.max': 'El documento fiscal no puede tener más de 50 caracteres'
      }),
    
    correoPersonal: Joi.string()
      .email()
      .max(191)
      .allow('')
      .optional()
      .messages({
        'string.email': 'Debe ser un correo electrónico válido',
        'string.max': 'El correo personal no puede tener más de 191 caracteres'
      }),
    
    correoEmpresa: Joi.string()
      .email()
      .max(191)
      .allow('')
      .optional()
      .messages({
        'string.email': 'Debe ser un correo electrónico válido',
        'string.max': 'El correo de empresa no puede tener más de 191 caracteres'
      })
  }).required(),
  
  servicios: Joi.array()
    .items(
      Joi.object({
        servicio: Joi.object({
          servicios_id: Joi.number()
            .integer()
            .positive()
            .optional(),
          id: Joi.number()
            .integer()
            .positive()
            .optional(),
          nombre: Joi.string().optional(),
          categoria: Joi.alternatives()
            .try(
              Joi.string(),
              Joi.object()
            )
            .optional(),
          precioMinimo: Joi.number().optional(),
          precio_minimo: Joi.number().optional(),
          precio_recomendado: Joi.number().optional(),
          descripcion: Joi.string().optional(),
          unidad_medida: Joi.object().optional()
        })
        .or('servicios_id', 'id')
        .required()
        .messages({
          'object.missing': 'Debe incluir servicios_id o id del servicio'
        }),
        
        // ✅ CAMPOS TRADICIONALES (para compatibilidad)
        cantidadServidores: Joi.number()
          .integer()
          .min(0)
          .default(0)
          .messages({
            'number.base': 'La cantidad de servidores debe ser un número',
            'number.integer': 'La cantidad de servidores debe ser un número entero',
            'number.min': 'La cantidad de servidores no puede ser negativa'
          }),
       
        cantidadEquipos: Joi.number()
          .integer()
          .min(0)
          .default(0)
          .messages({
            'number.base': 'La cantidad de equipos debe ser un número',
            'number.integer': 'La cantidad de equipos debe ser un número entero',
            'number.min': 'La cantidad de equipos no puede ser negativa'
          }),

        cantidadGb: Joi.number()
          .integer()
          .min(0)
          .default(0)
          .messages({
            'number.base': 'La cantidad de GB debe ser un número',
            'number.integer': 'La cantidad de GB debe ser un número entero',
            'number.min': 'La cantidad de GB no puede ser negativa'
          }),
        
        cantidadGB: Joi.number()
          .integer()
          .min(0)
          .default(0)
          .messages({
            'number.base': 'La cantidad de GB debe ser un número',
            'number.integer': 'La cantidad de GB debe ser un número entero',
            'number.min': 'La cantidad de GB no puede ser negativa'
          }),

        cantidadUsuarios: Joi.number()
          .integer()
          .min(0)
          .default(0)
          .messages({
            'number.base': 'La cantidad de usuarios debe ser un número',
            'number.integer': 'La cantidad de usuarios debe ser un número entero',
            'number.min': 'La cantidad de usuarios no puede ser negativa'
          }),

        cantidadSesiones: Joi.number()
          .integer()
          .min(0)
          .default(0)
          .messages({
            'number.base': 'La cantidad de sesiones debe ser un número',
            'number.integer': 'La cantidad de sesiones debe ser un número entero',
            'number.min': 'La cantidad de sesiones no puede ser negativa'
          }),

        cantidadTiempo: Joi.number()
          .integer()
          .min(0)
          .default(0)
          .messages({
            'number.base': 'La cantidad de tiempo debe ser un número',
            'number.integer': 'La cantidad de tiempo debe ser un número entero',
            'number.min': 'La cantidad de tiempo no puede ser negativa'
          }),

        // ✅ NUEVO: categoriasDetalle (CRÍTICO)
        categoriasDetalle: Joi.array()
          .items(
            Joi.object({
              id: Joi.number()
                .integer()
                .positive()
                .required()
                .messages({
                  'number.base': 'El ID de categoría debe ser un número',
                  'number.integer': 'El ID de categoría debe ser un número entero',
                  'number.positive': 'El ID de categoría debe ser positivo',
                  'any.required': 'El ID de categoría es requerido'
                }),
              
              categorias_id: Joi.number()
                .integer()
                .positive()
                .optional()
                .messages({
                  'number.base': 'El ID de categoría debe ser un número',
                  'number.integer': 'El ID de categoría debe ser un número entero',
                  'number.positive': 'El ID de categoría debe ser positivo'
                }),
              
              nombre: Joi.string()
                .max(255)
                .optional()
                .messages({
                  'string.max': 'El nombre no puede tener más de 255 caracteres'
                }),
              
              unidad_id: Joi.number()
                .integer()
                .positive()
                .optional()
                .messages({
                  'number.base': 'El ID de unidad debe ser un número',
                  'number.integer': 'El ID de unidad debe ser un número entero',
                  'number.positive': 'El ID de unidad debe ser positivo'
                }),
              
              unidad_nombre: Joi.string()
                .max(255)
                .optional()
                .messages({
                  'string.max': 'El nombre de unidad no puede tener más de 255 caracteres'
                }),
              
              unidad_tipo: Joi.string()
                .valid('cantidad', 'capacidad', 'tiempo', 'usuarios', 'sesiones')
                .optional()
                .messages({
                  'any.only': 'El tipo de unidad debe ser: cantidad, capacidad, tiempo, usuarios o sesiones'
                }),
              
              unidad_abreviacion: Joi.string()
                .max(20)
                .optional()
                .messages({
                  'string.max': 'La abreviación no puede tener más de 20 caracteres'
                }),
              
              cantidad: Joi.number()
                .integer()
                .min(0)
                .required()
                .messages({
                  'number.base': 'La cantidad debe ser un número',
                  'number.integer': 'La cantidad debe ser un número entero',
                  'number.min': 'La cantidad no puede ser negativa',
                  'any.required': 'La cantidad es requerida'
                })
            })
          )
          .optional()
          .messages({
            'array.base': 'Las categorías detalle deben ser un array'
          }),

        // ✅ NUEVO: cantidadesPorCategoria (opcional)
        cantidadesPorCategoria: Joi.object()
          .pattern(
            Joi.number().integer().positive(),
            Joi.number().integer().min(0)
          )
          .optional()
          .messages({
            'object.base': 'Las cantidades por categoría deben ser un objeto'
          }),

        // ✅ NUEVO: totalUnidadesParaPrecio (opcional)
        totalUnidadesParaPrecio: Joi.number()
          .integer()
          .min(0)
          .optional()
          .messages({
            'number.base': 'El total de unidades debe ser un número',
            'number.integer': 'El total de unidades debe ser un número entero',
            'number.min': 'El total de unidades no puede ser negativo'
          }),

        // ✅ CAMPO REQUERIDO: precioVentaFinal
        precioVentaFinal: Joi.number()
          .positive()
          .precision(2)
          .required()
          .messages({
            'number.base': 'El precio de venta debe ser un número',
            'number.positive': 'El precio de venta debe ser mayor a 0',
            'any.required': 'El precio de venta es requerido'
          }),

        // ✅ CAMPO OPCIONAL: añosContrato
        añosContrato: Joi.number()
          .integer()
          .min(1)
          .max(10)
          .optional()
          .messages({
            'number.base': 'Los años de contrato deben ser un número',
            'number.integer': 'Los años de contrato deben ser un número entero',
            'number.min': 'Los años de contrato deben ser al menos 1',
            'number.max': 'Los años de contrato no pueden ser más de 10'
          })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'Debe incluir al menos un servicio',
      'any.required': 'Los servicios son requeridos'
    }),
 
  añosContrato: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .required()
    .messages({
      'number.base': 'Los años de contrato deben ser un número',
      'number.integer': 'Los años de contrato deben ser un número entero',
      'number.min': 'Los años de contrato deben ser al menos 1',
      'number.max': 'Los años de contrato no pueden ser más de 10',
      'any.required': 'Los años de contrato son requeridos'
    }),
 
  precioTotal: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.base': 'El precio total debe ser un número',
      'number.positive': 'El precio total debe ser mayor a 0',
      'any.required': 'El precio total es requerido'
    }),
 
  tipoPrecio: Joi.string()
    .valid('minimo', 'venta')
    .required()
    .messages({
      'any.only': 'El tipo de precio debe ser: minimo o venta',
      'string.empty': 'El tipo de precio es requerido'
    }),
 
  configuracionPDF: Joi.object({
    incluirNombreEncargado: Joi.boolean().default(false),
    incluirNombreEmpresa: Joi.boolean().default(false),
    incluirDocumentoFiscal: Joi.boolean().default(false),
    incluirTelefonoEmpresa: Joi.boolean().default(false),
    incluirCorreoEmpresa: Joi.boolean().default(false)
  }).optional(),
 
  comentario: Joi.string()
    .allow('')
    .optional()
    .messages({
      'string.base': 'El comentario debe ser texto'
    })
}),

 // Crear cotización (formato admin/simple)
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

         // NUEVO: Campo cantidad_anos
         cantidad_anos: Joi.number()
           .integer()
           .min(1)
           .max(10)
           .default(1)
           .messages({
             'number.base': 'Los años deben ser un número',
             'number.integer': 'Los años deben ser un número entero',
             'number.min': 'Los años deben ser al menos 1',
             'number.max': 'Los años no pueden ser más de 10'
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
     .valid('pendiente', 'pendiente_aprobacion', 'efectiva', 'rechazada')
     .optional()
     .messages({
       'any.only': 'El estado debe ser: pendiente, pendiente_aprobacion, efectiva o rechazada'
     }),

   incluir_nombre_encargado: Joi.boolean()
     .optional()
     .messages({
       'boolean.base': 'Debe ser verdadero o falso'
     }),
   
   incluir_nombre_empresa: Joi.boolean()
     .optional()
     .messages({
       'boolean.base': 'Debe ser verdadero o falso'
     }),
   
   incluir_documento_fiscal: Joi.boolean()
     .optional()
     .messages({
       'boolean.base': 'Debe ser verdadero o falso'
     }),
   
   incluir_telefono_empresa: Joi.boolean()
     .optional()
     .messages({
       'boolean.base': 'Debe ser verdadero o falso'
     }),
   
   incluir_correo_empresa: Joi.boolean()
     .optional()
     .messages({
       'boolean.base': 'Debe ser verdadero o falso'
     }),
   
   tipo_precio_pdf: Joi.string()
     .valid('minimo', 'venta')
     .optional()
     .messages({
       'any.only': 'El tipo de precio debe ser: minimo o venta'
     })
 }),

 // Actualizar estado de cotización
 updateEstadoCotizacion: Joi.object({
   estado: Joi.string()
     .valid('pendiente', 'pendiente_aprobacion', 'efectiva', 'rechazada')
     .required()
     .messages({
       'any.only': 'El estado debe ser: pendiente, pendiente_aprobacion, efectiva o rechazada',
       'string.empty': 'El estado es requerido'
     }),
   
   comentario: Joi.string()
     .allow('')
     .optional()
     .messages({
       'string.base': 'El comentario debe ser texto'
     }),

   aprobado_por_nombre: Joi.string()
     .max(255)
     .optional()
     .when('estado', {
       is: 'efectiva',
       then: Joi.optional(),
       otherwise: Joi.optional()
     })
     .messages({
       'string.max': 'El nombre no puede tener más de 255 caracteres'
     }),

   rechazado_por_nombre: Joi.string()
     .max(255)
     .optional()
     .when('estado', {
       is: 'rechazada',
       then: Joi.optional(),
       otherwise: Joi.optional()
     })
     .messages({
       'string.max': 'El nombre no puede tener más de 255 caracteres'
     })
 })
};

// 🔧 EXPORTS ORIGINALES MANTENIDOS
module.exports = {
 validate,
 schemas
};

// También export individual para compatibilidad
const validateLogin = validate(schemas.login);
const validateCreateUser = validate(schemas.createUser);
const validateUpdateUser = validate(schemas.updateUser);
const validateCreateClient = validate(schemas.createClient);
const validateUpdateClient = validate(schemas.updateClient);
const validateCreateService = validate(schemas.createService);
const validateUpdateService = validate(schemas.updateService);
const validateCreateCategory = validate(schemas.createCategory);
const validateUpdateCategory = validate(schemas.updateCategory);
const validateCreateQuote = validate(schemas.createQuote);
const validateUpdateQuote = validate(schemas.updateQuote);
const validateCreateCotizacionVendedor = validate(schemas.createCotizacionVendedor);
const validateUpdateEstadoCotizacion = validate(schemas.updateEstadoCotizacion);
const validateChangePassword = validate(schemas.changePassword);
const validateCreateUsuario = validate(schemas.createUsuario);
const validateUpdateUsuario = validate(schemas.updateUsuario);
const validateCambiarContrasena = validate(schemas.cambiarContrasena);
const validateUpdateInformacionPersonal = validate(schemas.updateInformacionPersonal);
const validateForgotPassword = validate(schemas.forgotPassword);

module.exports = {
 validate,
 schemas,
 validateLogin,
 validateCreateUser,
 validateUpdateUser,
 validateCreateClient,
 validateUpdateClient,
 validateCreateService,
 validateUpdateService,
 validateCreateCategory,
 validateUpdateCategory,
 validateCreateQuote,
 validateUpdateQuote,
 validateCreateCotizacionVendedor,
 validateUpdateEstadoCotizacion,
 validateChangePassword,
 validateCreateUsuario,
 validateUpdateUsuario,
 validateCambiarContrasena,
 validateUpdateInformacionPersonal,
 validateForgotPassword,
};