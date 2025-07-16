// models/CotizacionDetalle.js
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
 // ✅ AGREGAR: Campo categorias_id FALTANTE
 categorias_id: {
   type: DataTypes.BIGINT,
   allowNull: false,
   references: {
     model: 'categorias',
     key: 'categorias_id'
   }
 },
 // 🆕 NUEVO: Relación directa con unidades de medida
 unidades_medida_id: {
   type: DataTypes.BIGINT,
   allowNull: false,
   references: {
     model: 'unidades_medida',
     key: 'unidades_medida_id'
   }
 },
 // 🆕 NUEVO: Campo unificado para cantidad
 cantidad: {
   type: DataTypes.INTEGER,
   allowNull: false,
   defaultValue: 1
 },
 // 🔄 MANTENER temporalmente para compatibilidad (eliminar después)
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

// ✅ AGREGAR ESTA FUNCIÓN PARA DEFINIR ASOCIACIONES
CotizacionDetalle.associate = function(models) {
 // Asociación con Cotizacion
 CotizacionDetalle.belongsTo(models.Cotizacion, {
   foreignKey: 'cotizaciones_id',
   as: 'cotizacion'
 });
 
 // Asociación con Servicio
 CotizacionDetalle.belongsTo(models.Servicio, {
   foreignKey: 'servicios_id',
   as: 'servicio'
 });
 
 // ✅ NUEVA: Asociación con Categoria
 CotizacionDetalle.belongsTo(models.Categoria, {
   foreignKey: 'categorias_id',
   as: 'categoria'
 });
 
 // ✅ NUEVA: Asociación con UnidadMedida
 CotizacionDetalle.belongsTo(models.UnidadMedida, {
   foreignKey: 'unidades_medida_id',
   as: 'unidad_medida'
 });
};

module.exports = CotizacionDetalle;