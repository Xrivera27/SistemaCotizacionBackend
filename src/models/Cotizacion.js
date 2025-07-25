const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cotizacion = sequelize.define('Cotizacion', {
  cotizaciones_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  clientes_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'clientes',
      key: 'clientes_id'
    }
  },
  usuarios_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'usuarios_id'
    }
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  total: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  comentario: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'pendiente_aprobacion', 'efectiva', 'rechazada'),
    defaultValue: 'pendiente'
  },
  pdf_generado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  incluir_nombre_encargado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  incluir_nombre_empresa: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  incluir_documento_fiscal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  incluir_telefono_empresa: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  incluir_correo_empresa: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tipo_precio_pdf: {
    type: DataTypes.ENUM('minimo', 'venta'),
    defaultValue: 'venta'
  },
  // 🆕 CAMPOS DE AUDITORÍA
  aprobado_por: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'usuarios_id'
    }
  },
  fecha_aprobacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rechazado_por: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'usuarios_id'
    }
  },
  fecha_rechazo: {
    type: DataTypes.DATE,
    allowNull: true
  },
  aprobado_por_nombre: {
  type: DataTypes.STRING(255),
  allowNull: true
},
rechazado_por_nombre: {
  type: DataTypes.STRING(255),
  allowNull: true
},
// Añadir estos campos al modelo Cotizacion después de rechazado_por_nombre:

  // 🆕 CAMPOS DE DESCUENTO
  descuento_porcentaje: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  total_original: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  comentario_descuento: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  descuento_otorgado_por: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'usuarios_id'
    }
  },
  descuento_otorgado_por_nombre: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  fecha_descuento: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tiene_descuento: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
  
}, {
  tableName: 'cotizaciones',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Cotizacion;