const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cliente = sequelize.define('Cliente', {
  clientes_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_encargado: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  telefono_personal: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  telefono_empresa: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  nombre_empresa: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  documento_fiscal: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  correo_personal: {
    type: DataTypes.STRING(191),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  correo_empresa: {
    type: DataTypes.STRING(191),
    allowNull: true,
    validate: {
      isEmail: true
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
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo'),
    defaultValue: 'activo'
  }
}, {
  tableName: 'clientes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Cliente;