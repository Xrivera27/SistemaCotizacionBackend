// routes/pdf.js
const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authorization');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /api/pdf/cotizacion/:id - Generar PDF de cotización
router.get('/cotizacion/:id', 
  authorizeRoles(['admin', 'vendedor', 'super_usuario']),
  pdfController.generarPDFCotizacion
);

// GET /api/pdf/cotizacion/:id/preview - Vista previa del PDF
router.get('/cotizacion/:id/preview', 
  authorizeRoles(['admin', 'vendedor', 'super_usuario']),
  pdfController.previewPDFCotizacion
);

module.exports = router;