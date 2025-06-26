const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CotizacionDetalle = sequelize.define('CotizacionDetalle', {
  detalles_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  cotizaciones_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'cotizaciones',
      key: 'cotizaciones_id'
    }
  },
  servicios_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'servicios',
      key: 'servicios_id'
    }
  },
  cantidad_equipos: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  cantidad_servicios: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  cantidad_gb: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  cantidad_anos: {           // 🆕 NUEVO CAMPO
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  precio_usado: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  }
}, {
  tableName: 'cotizacion_detalles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = CotizacionDetalle;