const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Solo log para errores y requests lentos
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    // Solo log si hay errores o es muy lento
    if (status >= 400) {
    
    } else if (duration > 3000) {

    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Middleware específico para errores de base de datos (mantener)
const dbErrorLogger = (error, req, res, next) => {
  if (error.name === 'SequelizeConnectionError' || 
      error.name === 'SequelizeTimeoutError' ||
      error.name === 'SequelizeConnectionTimedOutError') {
    
    console.error('🔥 DATABASE CONNECTION ERROR:');
    console.error(`   Time: ${new Date().toISOString()}`);
    console.error(`   Route: ${req.method} ${req.url}`);
    console.error(`   Error: ${error.name}`);
    console.error(`   Message: ${error.message}`);
    console.error('-----------------------------------');
  }
  
  next(error);
};

module.exports = {
  requestLogger,
  dbErrorLogger
};