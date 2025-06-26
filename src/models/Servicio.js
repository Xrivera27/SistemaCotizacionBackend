const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Servicio = sequelize.define('Servicio', {
  servicios_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  categorias_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'categorias',
      key: 'categorias_id'
    }
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  precio_minimo: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  precio_recomendado: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo'),
    defaultValue: 'activo',
    allowNull: false
  }
}, {
  tableName: 'servicios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Servicio;