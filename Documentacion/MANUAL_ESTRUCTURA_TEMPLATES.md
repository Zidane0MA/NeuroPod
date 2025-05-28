## 🔧 Estructura manejada para los templates en Neuropod

Este documento describe el sistema de templates manejado en NeuroPod.

> **Nota**: Sistema ya implementado. Falta mejorar el diseño card de los templates a algo mas vistoso sin cambiar las funcionalidades.

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
// Payload enviado desde AdminTemplates
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

#### Archivo template.service.ts

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

### 2. 