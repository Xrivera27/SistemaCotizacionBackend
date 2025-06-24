const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sesion = sequelize.define('Sesion', {
  sesiones_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  usuarios_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'usuarios_id'
    }
  },
  session_token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  jwt_hash: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  device_info: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  last_activity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('activa', 'expirada', 'revocada'),
    defaultValue: 'activa'
  }
}, {
  tableName: 'sesiones',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Sesion;