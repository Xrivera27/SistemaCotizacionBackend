const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Categoria = sequelize.define('Categoria', {
  categorias_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  unidades_medida_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'unidades_medida',
      key: 'unidades_medida_id'
    }
  },
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo'),
    defaultValue: 'activo',
    allowNull: false
  }
}, {
  tableName: 'categorias',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 🆕 ASOCIACIONES ACTUALIZADAS
Categoria.associate = function(models) {
  // Relación con UnidadMedida (belongsTo)
  Categoria.belongsTo(models.UnidadMedida, {
    foreignKey: 'unidades_medida_id',
    as: 'unidad_medida'
  });
  
  // Relación con Servicios (hasMany)
  Categoria.hasMany(models.Servicio, {
    foreignKey: 'categorias_id',
    as: 'servicios'
  });
};

module.exports = Categoria;