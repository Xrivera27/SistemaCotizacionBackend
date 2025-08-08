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
    type: DataTypes.DECIMAL(18, 4),
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
  descuento_porcentaje: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  total_original: {
    type: DataTypes.DECIMAL(18, 4),
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
  },
  meses_gratis: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  meses_gratis_otorgado_por: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'usuarios_id'
    }
  },
  meses_gratis_otorgado_por_nombre: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  fecha_meses_gratis: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tiene_meses_gratis: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'cotizaciones',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Cotizacion;