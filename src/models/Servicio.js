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
  categorias_ids: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
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
  // 🆕 NUEVOS CAMPOS DE LÍMITES
  limite_minimo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1.00,
    validate: {
      min: {
        args: [0.01],
        msg: 'El límite mínimo debe ser mayor a 0'
      }
    }
  },
  limite_maximo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
    validate: {
      isGreaterThanMin(value) {
        if (value !== null && this.limite_minimo && value < this.limite_minimo) {
          throw new Error('El límite máximo debe ser mayor o igual al límite mínimo');
        }
      }
    }
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
  updatedAt: 'updated_at',
  // 🆕 VALIDACIÓN A NIVEL DE MODELO
  validate: {
    limitesValidos() {
      if (this.limite_maximo !== null && this.limite_minimo && this.limite_maximo < this.limite_minimo) {
        throw new Error('El límite máximo debe ser mayor o igual al límite mínimo');
      }
    }
  }
});

module.exports = Servicio;