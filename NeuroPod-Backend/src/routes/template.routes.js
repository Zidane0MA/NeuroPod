const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Middleware de autenticación para todas las rutas
router.use(protect);

// GET /api/templates - Obtener todas las plantillas
router.get('/', templateController.getTemplates);
// POST /api/templates - Crear nueva plantilla (solo admins)
router.post('/', authorize('admin'), templateController.createTemplate);

// GET /api/templates/summary - Obtener resumen de plantillas (para dashboard)
router.get('/summary', templateController.getTemplatesSummary);

// GET /api/templates/:id - Obtener una plantilla específica
router.get('/:id', templateController.getTemplateById);
// PUT /api/templates/:id - Actualizar plantilla (solo el creador o admin)
router.put('/:id', templateController.updateTemplate);
// DELETE /api/templates/:id - Eliminar plantilla (solo el creador o admin)
router.delete('/:id', templateController.deleteTemplate);

module.exports = router;
