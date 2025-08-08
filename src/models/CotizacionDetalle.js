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
 categorias_id: {
   type: DataTypes.BIGINT,
   allowNull: false,
   references: {
     model: 'categorias',
     key: 'categorias_id'
   }
 },
 unidades_medida_id: {
   type: DataTypes.BIGINT,
   allowNull: false,
   references: {
     model: 'unidades_medida',
     key: 'unidades_medida_id'
   }
 },
 cantidad: {
   type: DataTypes.INTEGER,
   allowNull: false,
   defaultValue: 1
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
 cantidad_anos: {
   type: DataTypes.INTEGER,
   defaultValue: 1
 },
 precio_usado: {
   type: DataTypes.DECIMAL(15, 4),
   allowNull: false
 },
 subtotal: {
   type: DataTypes.DECIMAL(18, 4),
   allowNull: false
 }
}, {
 tableName: 'cotizacion_detalles',
 timestamps: true,
 createdAt: 'created_at',
 updatedAt: false
});

CotizacionDetalle.associate = function(models) {
 CotizacionDetalle.belongsTo(models.Cotizacion, {
   foreignKey: 'cotizaciones_id',
   as: 'cotizacion'
 });
 
 CotizacionDetalle.belongsTo(models.Servicio, {
   foreignKey: 'servicios_id',
   as: 'servicio'
 });
 
 CotizacionDetalle.belongsTo(models.Categoria, {
   foreignKey: 'categorias_id',
   as: 'categoria'
 });
 
 CotizacionDetalle.belongsTo(models.UnidadMedida, {
   foreignKey: 'unidades_medida_id',
   as: 'unidad_medida'
 });
};

module.exports = CotizacionDetalle;