const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UnidadMedida = sequelize.define('UnidadMedida', {
  unidades_medida_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  abreviacion: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  tipo: {
    type: DataTypes.ENUM('cantidad', 'capacidad', 'tiempo', 'usuarios', 'sesiones'),
    allowNull: false
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'unidades_medida',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 🆕 AGREGAR ASOCIACIONES
UnidadMedida.associate = function(models) {
  // Relación con Categorias (hasMany)
  UnidadMedida.hasMany(models.Categoria, {
    foreignKey: 'unidades_medida_id',
    as: 'categorias'
  });
  
  // 🆕 NUEVA: Relación con CotizacionDetalle (hasMany)
  UnidadMedida.hasMany(models.CotizacionDetalle, {
    foreignKey: 'unidades_medida_id',
    as: 'cotizacion_detalles'
  });
};

module.exports = UnidadMedida;