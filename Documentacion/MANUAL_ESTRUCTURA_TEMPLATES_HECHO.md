## 🔧 Estructura manejada para los templates en Neuropod

Este documento describe el sistema de templates manejado en NeuroPod.

> **Nota**: Sistema ya implementado. Falta mejorar el diseño card de los templates en el frontend (NeuroPod-Frontend\src\pages\admin\Templates.tsx) a algo mas vistoso sin cambiar las funcionalidades.

### 1. **API de Templates**

#### **Endpoint: GET /api/templates**
```javascript
// Respuesta esperada
{
  "success": true,
  "data": [
    {
      "id": "template_uuid_1",
      "name": "Ubuntu 22.04 Base",
      "dockerImage": "ubuntu:22.04",
      "httpPorts": [
        { "port": 8888, "serviceName": "Jupyter Lab" },
        { "port": 3000, "serviceName": "Web Server" }
      ],
      "tcpPorts": [
        { "port": 22, "serviceName": "SSH" }
      ],
      "containerDiskSize": 20,
      "volumeDiskSize": 50,
      "volumePath": "/workspace",
      "description": "## Ubuntu Base\\n\\nPlantilla base con Ubuntu 22.04..."
    }
  ]
}
```

#### **Endpoint: POST /api/templates**
```javascript
// Payload enviado desde NeuroPod-Frontend\src\pages\admin\Templates.tsx
{
  "name": "Mi Template",
  "dockerImage": "ubuntu:22.04",
  "httpPorts": [
    { "port": 8888, "serviceName": "Jupyter Lab" }
  ],
  "tcpPorts": [
    { "port": 22, "serviceName": "SSH" }
  ],
  "containerDiskSize": 10,
  "volumeDiskSize": 20,
  "volumePath": "/workspace",
  "description": "Descripción en markdown..."
}
```

#### **Otros Endpoints establecidos:**
- `PUT /api/templates/:id` - Actualizar template
- `DELETE /api/templates/:id` - Eliminar template

### 2. template service. Frontend (NeuroPod-Frontend\src\services\template.service.ts)
```ts
import api from "./api";
import { Template, CreateTemplateParams } from "@/types/template";

export const templateService = {
  /**
   * Get all templates
   */
  async getTemplates(): Promise<Template[]> {
    try {
      const response = await api.get("/api/templates");
      return response.data;
    } catch (error) {
      console.error("Error fetching templates:", error);
      throw error;
    }
  },

  /**
   * Create a new template
   */
  async createTemplate(template: CreateTemplateParams): Promise<Template> {
    try {
      const response = await api.post("/templates", template);
      // El backend retorna { message: ..., template: ... }
      return response.data.template || response.data;
    } catch (error) {
      console.error("Error creating template:", error);
      throw error;
    }
  },

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, template: Partial<CreateTemplateParams>): Promise<Template> {
    try {
      const response = await api.put(`/templates/${id}`, template);
      // El backend retorna { message: ..., template: ... }
      return response.data.template || response.data;
    } catch (error) {
      console.error("Error updating template:", error);
      throw error;
    }
  },

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      await api.delete(`/templates/${id}`);
    } catch (error) {
      console.error("Error deleting template:", error);
      throw error;
    }
  },

  /**
   * Get a single template by ID
   */
  async getTemplateById(id: string): Promise<Template> {
    try {
      const response = await api.get(`/templates/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching template:", error);
      throw error;
    }
  }
};
```

### 3. Template model. Backend (NeuroPod-Backend\src\models\Template.model.js)
```js
const mongoose = require('mongoose');

const PortMappingSchema = new mongoose.Schema({
  port: {
    type: Number,
    required: true,
    min: 1,
    max: 65535
  },
  serviceName: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const TemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  dockerImage: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  httpPorts: {
    type: [PortMappingSchema],
    required: true,
    validate: {
      validator: function(ports) {
        return ports && ports.length > 0;
      },
      message: 'Al menos un puerto HTTP es requerido'
    }
  },
  tcpPorts: {
    type: [PortMappingSchema],
    default: []
  },
  containerDiskSize: {
    type: Number,
    required: true,
    min: 5,
    max: 100,
    default: 10
  },
  volumeDiskSize: {
    type: Number,
    required: true,
    min: 10,
    max: 150,
    default: 20
  },
  volumePath: {
    type: String,
    required: true,
    default: '/workspace',
    trim: true
  },
  description: {
    type: String,
    default: '',
    maxlength: 5000
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt en cada save
TemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Validación personalizada para evitar puertos duplicados dentro del mismo template
TemplateSchema.pre('save', function(next) {
  const allPorts = [...this.httpPorts, ...this.tcpPorts];
  const portNumbers = allPorts.map(p => p.port);
  const uniquePorts = new Set(portNumbers);
  
  if (portNumbers.length !== uniquePorts.size) {
    const error = new Error('No se pueden tener puertos duplicados en el mismo template');
    return next(error);
  }
  next();
});

// Método para obtener todos los puertos como string (para compatibilidad)
TemplateSchema.methods.getPortsAsString = function() {
  return this.httpPorts.map(p => p.port).join(', ');
};

// Método para obtener información resumida
TemplateSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    dockerImage: this.dockerImage,
    totalPorts: this.httpPorts.length + this.tcpPorts.length,
    totalStorage: this.containerDiskSize + this.volumeDiskSize,
    createdAt: this.createdAt
  };
};

// Virtual para convertir _id a id
TemplateSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialised.
TemplateSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Template', TemplateSchema);
```

### 4. template routes. Backend (NeuroPod-Backend\src\routes\template.routes.js)
```js
const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Middleware de autenticación para todas las rutas
router.use(protect);

// GET /api/templates - Obtener todas las plantillas
router.get('/', templateController.getTemplates);

// GET /api/templates/summary - Obtener resumen de plantillas (para dashboard)
router.get('/summary', templateController.getTemplatesSummary);

// GET /api/templates/:id - Obtener una plantilla específica
router.get('/:id', templateController.getTemplateById);

// POST /api/templates - Crear nueva plantilla (solo admins)
router.post('/', authorize('admin'), templateController.createTemplate);

// PUT /api/templates/:id - Actualizar plantilla (solo el creador o admin)
router.put('/:id', templateController.updateTemplate);

// DELETE /api/templates/:id - Eliminar plantilla (solo el creador o admin)
router.delete('/:id', templateController.deleteTemplate);

module.exports = router;
```

### 5. template controller. Backend (NeuroPod-Backend\src\controllers\template.controller.js)

> **Nota:** Revisar el archivo para entender el codigo completo.

```js
const Template = require('../models/Template.model');
const User = require('../models/User.model');

// Obtener todas las plantillas
const getTemplates = async (req, res) => {
  // Codigo ...
};

// Obtener una plantilla por ID
const getTemplateById = async (req, res) => {
  // Codigo ...
};

// Crear una nueva plantilla
const createTemplate = async (req, res) => {
  // Codigo ...
};

// Actualizar una plantilla existente
const updateTemplate = async (req, res) => {
  // Codigo ...
};

// Eliminar una plantilla
const deleteTemplate = async (req, res) => {
  // Codigo ...
};

// Obtener resumen de plantillas (para dashboard)
const getTemplatesSummary = async (req, res) => {
  try {
    const totalTemplates = await Template.countDocuments();
    const recentTemplates = await Template.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name')
      .select('name dockerImage createdAt');

    const templatesByUser = await Template.aggregate([
      {
        $group: {
          _id: '$createdBy',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          userName: '$user.name',
          templateCount: '$count'
        }
      },
      {
        $sort: { templateCount: -1 }
      }
    ]);

    res.status(200).json({
      total: totalTemplates,
      recent: recentTemplates,
      byUser: templatesByUser
    });

  } catch (error) {
    console.error('Error al obtener resumen de plantillas:', error);
    res.status(500).json({ 
      message: 'Error al obtener resumen de plantillas',
      error: error.message 
    });
  }
};

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplatesSummary
};