const express = require('express');
const { 
  googleLogin, 
  googleCallback,
  mockLogin,
  logout, 
  verifyToken,
  getMe,
  updateUserBalance,
  getAllUsers
} = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Rutas públicas
router.post('/google', googleLogin);
router.get('/google/callback', googleCallback);

// Ruta de login simulado (para desarrollo)
// Hacemos la ruta SIEMPRE disponible para facilitar las pruebas
router.post('/mock-login', mockLogin);

// Rutas protegidas
router.post('/logout', protect, logout);
router.get('/verify', protect, verifyToken);
router.get('/me', protect, getMe);

// Rutas de administrador
router.get('/users', protect, authorize('admin'), getAllUsers);
router.post('/users/balance', protect, authorize('admin'), updateUserBalance);

module.exports = router;