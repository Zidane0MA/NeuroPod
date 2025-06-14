const express = require('express');
const { 
  getSystemStatus
} = require('../controllers/status.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Ruta pública para verificar el estado de la API
router.get('/public', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API de NeuroPod funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Rutas protegidas
router.get('/', protect, getSystemStatus);

module.exports = router;
