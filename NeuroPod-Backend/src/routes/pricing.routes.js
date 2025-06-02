const express = require('express');
const { 
  getPricing,
  updatePricing,
  calculateCost,
  getGpuInfo,
  getAvailableGpus,
  resetPricing
} = require('../controllers/pricing.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Rutas públicas/protegidas básicas
router.get('/', protect, getPricing);
router.post('/calculate-cost', protect, calculateCost);
router.get('/gpus/available', protect, getAvailableGpus);
router.get('/gpus/:gpuId', protect, getGpuInfo);

// Rutas solo para administradores
router.put('/', protect, authorize('admin'), updatePricing);
router.post('/reset', protect, authorize('admin'), resetPricing);

module.exports = router;
