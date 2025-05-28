const express = require('express');
const { 
  getPods,
  getPodConnections,
  createPod,
  startPod,
  stopPod,
  deletePod,
  getPodLogs
} = require('../controllers/pod.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas principales para pods
router.route('/')
  .get(getPods)         // GET /api/pods - Obtener pods del usuario actual
  .post(createPod);     // POST /api/pods - Crear nuevo pod

// Ruta específica para admin buscar pods por email
router.get('/admin', authorize('admin'), getPods); // GET /api/pods/admin?userEmail=user@example.com

// Rutas específicas de pod
router.get('/:podId/connections', getPodConnections);  // GET /api/pods/:podId/connections
router.get('/:podId/logs', getPodLogs);               // GET /api/pods/:podId/logs

router.post('/:podId/start', startPod);               // POST /api/pods/:podId/start
router.post('/:podId/stop', stopPod);                 // POST /api/pods/:podId/stop
router.delete('/:podId', deletePod);                  // DELETE /api/pods/:podId

module.exports = router;
