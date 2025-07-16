// models/index.js - ACTUALIZADO COMPLETO

const { sequelize } = require('../config/database');
const Usuario = require('./Usuario');
const Sesion = require('./Sesion');
const Cliente = require('./Cliente');
const Categoria = require('./Categoria');
const UnidadMedida = require('./UnidadMedida');
const Servicio = require('./Servicio');
const Cotizacion = require('./Cotizacion');
const CotizacionDetalle = require('./CotizacionDetalle');

// Definir asociaciones
const defineAssociations = () => {
  // ✅ VALIDAR que los modelos existen antes de definir asociaciones
  if (!Usuario || !Sesion || !Cliente || !Categoria || !UnidadMedida || 
      !Servicio || !Cotizacion || !CotizacionDetalle) {
    console.error('❌ Error: Uno o más modelos no están definidos correctamente');
    return;
  }

  // Usuario - Sesion (1:N)
  Usuario.hasMany(Sesion, { foreignKey: 'usuarios_id', as: 'sesiones' });
  Sesion.belongsTo(Usuario, { foreignKey: 'usuarios_id', as: 'usuario' });

  // Usuario - Cliente (1:N)
  Usuario.hasMany(Cliente, { foreignKey: 'usuarios_id', as: 'clientes' });
  Cliente.belongsTo(Usuario, { foreignKey: 'usuarios_id', as: 'manager' });

  // ✅ CORREGIDO: UnidadMedida - Categoria (1:N)
  UnidadMedida.hasMany(Categoria, { foreignKey: 'unidades_medida_id', as: 'categorias' });
  Categoria.belongsTo(UnidadMedida, { foreignKey: 'unidades_medida_id', as: 'unidad_medida' });

  // ✅ NUEVO: UnidadMedida - CotizacionDetalle (1:N) - RELACIÓN DIRECTA
  UnidadMedida.hasMany(CotizacionDetalle, { foreignKey: 'unidades_medida_id', as: 'cotizacion_detalles' });
  CotizacionDetalle.belongsTo(UnidadMedida, { foreignKey: 'unidades_medida_id', as: 'unidad_medida' });

  // Categoria - Servicio (1:N)
  Categoria.hasMany(Servicio, { foreignKey: 'categorias_id', as: 'servicios' });
  Servicio.belongsTo(Categoria, { foreignKey: 'categorias_id', as: 'categoria' });

  // Usuario - Cotizacion (1:N)
  Usuario.hasMany(Cotizacion, { foreignKey: 'usuarios_id', as: 'cotizaciones' });
  Cotizacion.belongsTo(Usuario, { foreignKey: 'usuarios_id', as: 'vendedor' });

  // Cliente - Cotizacion (1:N)
  Cliente.hasMany(Cotizacion, { foreignKey: 'clientes_id', as: 'cotizaciones' });
  Cotizacion.belongsTo(Cliente, { foreignKey: 'clientes_id', as: 'cliente' });

  // Cotizacion - CotizacionDetalle (1:N)
  Cotizacion.hasMany(CotizacionDetalle, { foreignKey: 'cotizaciones_id', as: 'detalles' });
  CotizacionDetalle.belongsTo(Cotizacion, { foreignKey: 'cotizaciones_id', as: 'cotizacion' });

  // Servicio - CotizacionDetalle (1:N)
  Servicio.hasMany(CotizacionDetalle, { foreignKey: 'servicios_id', as: 'detalles' });
  CotizacionDetalle.belongsTo(Servicio, { foreignKey: 'servicios_id', as: 'servicio' });

  console.log('✅ Asociaciones de modelos definidas correctamente');
};

// Función para conectar a la BD
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    process.exit(1);
  }
};

// Sincronizar modelos
const syncModels = async () => {
  try {
    await sequelize.sync({ alter: false });
    console.log('✅ Modelos sincronizados con la base de datos');
  } catch (error) {
    console.error('❌ Error sincronizando modelos:', error);
  }
};

// ✅ LLAMAR A LAS ASOCIACIONES
defineAssociations();

module.exports = {
  sequelize,
  connectDB,
  syncModels,
  Usuario,
  Sesion,
  Cliente,
  Categoria,
  UnidadMedida,
  Servicio,
  Cotizacion,
  CotizacionDetalle
};