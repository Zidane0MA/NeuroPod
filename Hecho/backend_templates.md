## 🔧 Especificaciones Detalladas para el Backend

### 1. **API de Templates** - `PRIORIDAD ALTA`

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

#### **Otros Endpoints Necesarios:**
- `PUT /api/templates/:id` - Actualizar template
- `DELETE /api/templates/:id` - Eliminar template

---

#### **Otros Endpoints Necesarios:**
- `GET /api/pods` - Listar pods del usuario actual
- `GET /api/pods?userEmail=user@email.com` - Listar pods de usuario específico (solo admin)
- `POST /api/pods/:id/start` - Iniciar pod
- `POST /api/pods/:id/stop` - Detener pod
- `DELETE /api/pods/:id` - Eliminar pod
- `GET /api/pods/:id/logs` - Obtener logs del pod

---

### 3. **Lógica de Despliegue en Kubernetes** - `PRIORIDAD ALTA`

#### **Casos a Implementar:**

##### **Template seleccionado sin Jupyter:**
```javascript
if (deploymentType === "template" && !templateHasJupyter && enableJupyter) {
  // Instalar Jupyter Lab en el contenedor
  // Usar puerto 8888 aunque no esté en la lista de puertos
}
```

##### **Template seleccionado con Jupyter:**
```javascript
if (deploymentType === "template" && templateHasJupyter) {
  // No hacer nada especial, el template ya incluye Jupyter
  // Respetar la configuración del template
}
```

##### **Imagen Docker custom:**
```javascript
if (deploymentType === "docker") {
  // Usar la imagen especificada por el usuario
  if (enableJupyter) {
    // Intentar instalar Jupyter Lab
    // El usuario es responsable de los puertos
  }
}
```

### 4. **Sistema de Precios** - `PRIORIDAD MEDIA`

#### **Endpoint: GET /api/pricing**
```javascript
{
  "success": true,
  "data": {
    "gpus": {
      "rtx-4050": { "price": 2.50, "available": true },
      "rtx-4080": { "price": 4.99, "available": false },
      "rtx-4090": { "price": 8.99, "available": false }
    },
    "storage": {
      "containerDisk": 0.05, // €/GB/hora
      "volumeDisk": 0.10     // €/GB/hora
    }
  }
}
```

#### **Endpoint: PUT /api/admin/pricing** (solo admin)
- Permitir cambiar precios de GPUs y almacenamiento

---

### 5. **Gestión de Usuarios y Saldo** - `PRIORIDAD MEDIA`

#### **Validaciones Necesarias:**
```javascript
// Antes de crear pod
if (user.role === "client" && user.balance < totalCost) {
  return { error: "Saldo insuficiente" };
}

// Si es admin asignando a usuario
if (assignToUser && user.role === "admin") {
  const targetUser = await User.findOne({ email: assignToUser });
  if (!targetUser) return { error: "Usuario no encontrado" };
  // Crear pod para targetUser
}
```

#### **Descuento de Saldo:**
```javascript
// Al iniciar pod (no al crearlo)
await User.updateOne(
  { _id: userId },
  { $inc: { balance: -costPerHour } }
);
```