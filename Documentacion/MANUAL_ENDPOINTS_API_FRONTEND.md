# 📡 Documentación de Endpoints API - NeuroPod Frontend

## 📖 Introducción

Esta documentación describe todos los endpoints de la API que utiliza el frontend de NeuroPod para comunicarse con el backend. Los endpoints están organizados por funcionalidad y incluyen detalles sobre métodos HTTP, parámetros, respuestas y casos de uso.

---

## 🏗️ Configuración Base

### URL Base de la API
```
VITE_API_URL=http://localhost:3000
```

### Autenticación
Todos los endpoints protegidos requieren un token JWT en el header:
```
Authorization: Bearer <token>
```

### Timeout de Conexión
```
timeout: 5000ms
```

---

## 📊 Estados de Respuesta

### Códigos de Estado Comunes
- **200**: Operación exitosa
- **401**: Token expirado o inválido (redirección automática a `/login`)
- **403**: Sin permisos para realizar la operación
- **404**: Recurso no encontrado
- **500**: Error interno del servidor

### Manejo de Errores de Conexión
Cuando el backend no está disponible, el frontend activa automáticamente el **modo de simulación** para desarrollo.

---

## 🔐 Endpoints de Autenticación

### **POST** `/api/auth/google`
**Descripción**: Iniciar sesión con Google OAuth2

**Payload**:
```json
{
  "token": "google_oauth_token_here"
}
```

**Respuesta exitosa**:
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Usuario Nombre",
    "role": "client|admin",
    "balance": 10.00,
    "registrationDate": "2024-01-15",
    "activePods": 1,
    "totalPods": 3,
    "status": "online"
  }
}
```

**Casos de uso**:
- Login principal con Google OAuth2
- Registro automático de nuevos usuarios

---

### **POST** `/api/auth/mock-login`
**Descripción**: Login simulado para desarrollo

**Payload**:
```json
{
  "email": "lolerodiez@gmail.com"
}
```

**Respuesta exitosa**:
```json
{
  "token": "mock-token-for-development",
  "user": {
    "id": "admin-1",
    "email": "lolerodiez@gmail.com",
    "name": "Admin",
    "role": "admin",
    "balance": "Infinity",
    "registrationDate": "2024-01-01",
    "activePods": 2,
    "totalPods": 5,
    "status": "online"
  }
}
```

**Notas**:
- Solo disponible en `NODE_ENV=development`
- `lolerodiez@gmail.com` siempre obtiene rol `admin`
- Otros emails obtienen rol `client`

---

### **GET** `/api/auth/verify`
**Descripción**: Verificar validez del token JWT actual

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa**:
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Usuario Nombre",
    "role": "client|admin",
    "balance": 10.00,
    "registrationDate": "2024-01-15",
    "activePods": 1,
    "totalPods": 3,
    "status": "online"
  }
}
```

**Casos de uso**:
- Verificar sesión al cargar la aplicación
- Recuperar información del usuario actual

---

### **POST** `/api/auth/logout`
**Descripción**: Cerrar sesión del usuario

**Payload**:
```json
{
  "token": "jwt_token_here"
}
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Sesión cerrada correctamente"
}
```

**Casos de uso**:
- Cierre de sesión manual
- Invalidación del token en el servidor

---

## 🚀 Endpoints de Pods

### **GET** `/api/pods`
**Descripción**: Obtener todos los pods del usuario actual

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": [
    {
      "podId": "pod_uuid_1",
      "podName": "mi-pod-comfyui",
      "userId": "user_id",
      "userHash": "usr123",
      "createdBy": "user_id",
      "deploymentType": "template",
      "templateId": "template_uuid_1",
      "gpu": "rtx-4050",
      "containerDiskSize": 10,
      "volumeDiskSize": 20,
      "enableJupyter": true,
      "status": "running",
      "httpServices": [
        {
          "port": 8888,
          "serviceName": "Jupyter Lab",
          "url": "https://pod-usr123-8888.neuropod.online",
          "isCustom": false,
          "status": "ready"
        }
      ],
      "tcpServices": [
        {
          "port": 22,
          "serviceName": "SSH", 
          "url": "tcp://pod-usr123-22.neuropod.online:22",
          "isCustom": false,
          "status": "disable"
        }
      ],
      "createdAt": "2024-01-15T10:30:00Z",
      "lastActive": "2024-01-15T12:45:00Z",
      "kubernetesResources": {
        "podName": "k8s-pod-usr123",
        "pvcName": "pvc-pod-usr123",
        "namespace": "default"
      },
      "stats": {
        "cpuUsage": 25,
        "memoryUsage": 52,
        "gpuUsage": 65,
        "uptime": 8100,
        "lastUpdated": "2024-01-15T12:45:00Z"
      }
    }
  ]
}
```

**Casos de uso**:
- Listar pods del usuario en `/client/pods`
- Listar pods del admin en `/admin/pods`

---

### **GET** `/api/pods?userEmail={email}`
**Descripción**: Buscar pods por email de usuario (solo administradores)

**Parámetros de consulta**:
- `userEmail`: Email del usuario cuyos pods buscar

**Headers requeridos**:
```
Authorization: Bearer <admin_token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": [
    {
      "podId": "pod_uuid_2",
      "podName": "cliente-pod-ubuntu",
      "userId": "client_user_id",
      "userHash": "cli456",
      "createdBy": "admin_user_id",
      "userEmail": "cliente@example.com",
      // ... resto de campos del pod
    }
  ]
}
```

**Casos de uso**:
- Búsqueda de pods por usuario en `/admin/pods`
- Soporte técnico y administración

---

### **GET** `/api/pods/{podId}/connections`
**Descripción**: Obtener información de conexiones de un pod específico

**Parámetros de ruta**:
- `podId`: ID único del pod

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "podId": "pod_uuid_1",
    "podName": "mi-pod-comfyui",
    "status": "running",
    "httpServices": [
      {
        "port": 8888,
        "serviceName": "Jupyter Lab",
        "url": "https://pod-usr123-8888.neuropod.online",
        "isCustom": false,
        "status": "ready",
        "jupyterToken": "token_if_applicable"
      },
      {
        "port": 7860,
        "serviceName": "ComfyUI",
        "url": "https://pod-usr123-7860.neuropod.online",
        "isCustom": false,
        "status": "ready"
      }
    ],
    "tcpServices": [
      {
        "port": 22,
        "serviceName": "SSH",
        "url": "tcp://pod-usr123-22.neuropod.online:22",
        "isCustom": false,
        "status": "disable"
      }
    ],
    "message": "Pod running successfully"
  }
}
```

**Casos de uso**:
- Modal de conexión a servicios del pod
- Verificar estado de servicios antes de conectar

---

### **GET** `/api/pods/{podId}/logs`
**Descripción**: Obtener logs del contenedor del pod

**Parámetros de ruta**:
- `podId`: ID único del pod

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "logs": "[12:30:45] Iniciando contenedor ComfyUI\n[12:30:46] Montando volumen en /workspace\n[12:30:50] ComfyUI disponible en puerto 7860\n[12:30:52] Jupyter Lab disponible en puerto 8888\n[12:30:55] Contenedor listo para uso"
  }
}
```

**Casos de uso**:
- Modal de logs en tiempo real
- Debugging y diagnóstico de problemas

---

### **POST** `/api/pods`
**Descripción**: Crear un nuevo pod

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Payload**:
```json
{
  "name": "mi-nuevo-pod",
  "deploymentType": "template",
  "template": "template_uuid_1",
  "gpu": "rtx-4050",
  "containerDiskSize": 10,
  "volumeDiskSize": 20,
  "ports": "8888, 7860",
  "enableJupyter": true,
  "assignToUser": "cliente@example.com"
}
```

**Campos del Payload**:
- `name` *(string)*: Nombre del pod
- `deploymentType` *(string)*: `"template"` o `"docker"`
- `template` *(string, opcional)*: ID de template si `deploymentType="template"`
- `dockerImage` *(string, opcional)*: Imagen Docker si `deploymentType="docker"`
- `gpu` *(string)*: Tipo de GPU (`"rtx-4050"`, `"rtx-4080"`, `"rtx-4090"`)
- `containerDiskSize` *(number)*: Tamaño del disco del contenedor en GB
- `volumeDiskSize` *(number)*: Tamaño del volumen persistente en GB
- `ports` *(string)*: Lista de puertos separados por comas
- `enableJupyter` *(boolean)*: Habilitar Jupyter Lab
- `assignToUser` *(string, opcional)*: Email del usuario (solo para admins)

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "podId": "new_pod_uuid",
    "podName": "mi-nuevo-pod",
    "status": "creating",
    "message": "Pod creándose. Por favor espere unos minutos."
  }
}
```

**Casos de uso**:
- Crear pod desde `/client/pods/deploy`
- Admin crear pod para cliente desde `/admin/pods/deploy`

---

### **POST** `/api/pods/{podId}/start`
**Descripción**: Iniciar un pod detenido

**Parámetros de ruta**:
- `podId`: ID único del pod

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "podId": "pod_uuid_1",
    "status": "creating"
  }
}
```

**Casos de uso**:
- Botón "Iniciar" en cards de pods
- Reactivar pods detenidos

---

### **POST** `/api/pods/{podId}/stop`
**Descripción**: Detener un pod en ejecución

**Parámetros de ruta**:
- `podId`: ID único del pod

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "podId": "pod_uuid_1",
    "status": "stopped"
  }
}
```

**Casos de uso**:
- Botón "Detener" en cards de pods
- Ahorro de recursos cuando no se use

---

### **DELETE** `/api/pods/{podId}`
**Descripción**: Eliminar un pod permanentemente

**Parámetros de ruta**:
- `podId`: ID único del pod

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Pod eliminado correctamente"
}
```

**Casos de uso**:
- Botón "Eliminar" en cards de pods
- Limpieza de pods no utilizados

---

## 🎯 Endpoints de Templates

### **GET** `/api/templates`
**Descripción**: Obtener todas las plantillas disponibles

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": [
    {
      "id": "template_uuid_1",
      "name": "Ubuntu 22.04 Base",
      "dockerImage": "ubuntu:22.04",
      "httpPorts": [
        {
          "port": 8888,
          "serviceName": "Jupyter Lab"
        },
        {
          "port": 3000,
          "serviceName": "Web Server"
        }
      ],
      "tcpPorts": [
        {
          "port": 22,
          "serviceName": "SSH"
        }
      ],
      "containerDiskSize": 20,
      "volumeDiskSize": 50,
      "volumePath": "/workspace",
      "description": "## Ubuntu Base\n\nPlantilla base con Ubuntu 22.04..."
    }
  ]
}
```

**Casos de uso**:
- Listar templates en páginas de deploy
- Administración de templates en `/admin/templates`

---

### **POST** `/api/templates`
**Descripción**: Crear una nueva plantilla (solo administradores)

**Headers requeridos**:
```
Authorization: Bearer <admin_token>
```

**Payload**:
```json
{
  "name": "Mi Template Personalizado",
  "dockerImage": "ubuntu:22.04",
  "httpPorts": [
    {
      "port": 8888,
      "serviceName": "Jupyter Lab"
    }
  ],
  "tcpPorts": [
    {
      "port": 22,
      "serviceName": "SSH"
    }
  ],
  "containerDiskSize": 10,
  "volumeDiskSize": 20,
  "volumePath": "/workspace",
  "description": "Descripción en markdown del template..."
}
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Template creado correctamente",
  "template": {
    "id": "new_template_uuid",
    "name": "Mi Template Personalizado",
    // ... resto de campos
  }
}
```

**Casos de uso**:
- Crear templates desde `/admin/templates`

---

### **GET** `/api/templates/{id}`
**Descripción**: Obtener detalles de una plantilla específica

**Parámetros de ruta**:
- `id`: ID único del template

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "id": "template_uuid_1",
    "name": "Ubuntu 22.04 Base",
    "dockerImage": "ubuntu:22.04",
    // ... resto de campos
  }
}
```

**Casos de uso**:
- Ver detalles de template antes de usar
- Editar template existente

---

### **PUT** `/api/templates/{id}`
**Descripción**: Actualizar una plantilla existente

**Parámetros de ruta**:
- `id`: ID único del template

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Payload**:
```json
{
  "name": "Ubuntu 22.04 Base Actualizado",
  "dockerImage": "ubuntu:22.04",
  "httpPorts": [
    {
      "port": 8888,
      "serviceName": "Jupyter Lab"
    }
  ],
  "tcpPorts": [
    {
      "port": 22,
      "serviceName": "SSH"
    }
  ],
  "containerDiskSize": 15,
  "volumeDiskSize": 30,
  "volumePath": "/workspace",
  "description": "Descripción actualizada..."
}
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Template actualizado correctamente",
  "template": {
    "id": "template_uuid_1",
    "name": "Ubuntu 22.04 Base Actualizado",
    // ... resto de campos actualizados
  }
}
```

**Casos de uso**:
- Editar templates desde `/admin/templates`

---

### **DELETE** `/api/templates/{id}`
**Descripción**: Eliminar una plantilla

**Parámetros de ruta**:
- `id`: ID único del template

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Template eliminado correctamente"
}
```

**Casos de uso**:
- Eliminar templates obsoletos desde `/admin/templates`

---

## 🏥 Endpoints de Estado del Sistema

### **GET** `/api/status/public`
**Descripción**: Verificar estado público de la API (sin autenticación)

**Respuesta exitosa**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:30:00Z",
  "version": "1.0.0"
}
```

**Casos de uso**:
- Verificar si el backend está disponible
- Health check antes de operaciones

---

### **GET** `/api/status`
**Descripción**: Estado detallado del sistema (requiere autenticación)

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "kubernetes": "connected",
    "activePods": 15,
    "totalUsers": 25,
    "systemLoad": {
      "cpu": 45,
      "memory": 60,
      "disk": 30
    }
  }
}
```

**Casos de uso**:
- Dashboard de administrador
- Monitoreo del sistema

---

### **GET** `/api/status/pricing`
**Descripción**: Obtener configuración actual de precios

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "gpu": {
      "rtx-4050": 2.50,
      "rtx-4080": 4.99,
      "rtx-4090": 8.99
    },
    "storage": {
      "containerDisk": 0.05,
      "volumeDisk": 0.10
    },
    "freeTier": true
  }
}
```

**Casos de uso**:
- Mostrar precios en página de deploy
- Mostrar precios en pagina /pricing (no necesitaria autorizacion)
- Calcular costos estimados

---

### **POST** `/api/status/pricing`
**Descripción**: Configuración de precios

**Headers requeridos**:
```
Authorization: Bearer <admin_token>
```

Verificar con list_allowed_directories las carpetas a las que tienes acceso, tengo un problema con mi backend y el frontend, en mi frontend necesito configurar precios en la pagina /admin/settings (src\pages\admin\Settings.tsx y src\components\admin\settings\PricingSettings.tsx), en esta pagina se deben ver los precios configurados actuales y actualizar los precios, (no planeo darle funcionalidad al boton Free Tier), estas configuraciones de precios se deben ver reflejadas en /pricing (src\pages\Pricing.tsx y src\components\pricing\PricingCards.tsx) y en las paginas /admin/pods/deploy (src\pages\admin\PodDeploy.tsx) y /client/pods/deploy (src\pages\client\PodDeploy.tsx). En mi backend tengo un sistema de obtención de precios por variables de entorno, quiero cambiarlo, que se obtiene de (src\models\Pod.model.js) y se usa en (src\controllers\status.controller.js, src\controllers\pod.controller.js y src\utils\podHelpers.js), tambien tengo unas rutas configuradas en (src\routes\status.routes.js, /pricing y /calculate-cost) cosa que falta adaptar. Tambien he creado un nuevo modelo de precios, aunque es muy basico (src\models\Pricing.model.js).

**Casos de uso**:
- Configurar precios en pagina /admin/settings

---

### **POST** `/api/status/calculate-cost`
**Descripción**: Calcular costo estimado de configuración

**Headers requeridos**:
```
Authorization: Bearer <token>
```

**Payload**:
```json
{
  "gpu": "rtx-4050",
  "containerDiskSize": 10,
  "volumeDiskSize": 20,
  "hours": 24
}
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "hourly": 2.80,
    "daily": 67.20,
    "breakdown": {
      "gpu": 2.50,
      "containerDisk": 0.50,
      "volumeDisk": 2.00
    }
  }
}
```

**Casos de uso**:
- Calculadora de costos en página de deploy
- Estimaciones antes de crear pods

---

## 👥 Endpoints de Administración de Usuarios

### **GET** `/api/auth/users`
**Descripción**: Obtener lista de todos los usuarios (solo administradores)

**Headers requeridos**:
```
Authorization: Bearer <admin_token>
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": [
    {
      "id": "user_uuid_1",
      "email": "cliente@example.com",
      "name": "Cliente Ejemplo",
      "registrationDate": "2024-01-10",
      "activePods": 2,
      "totalPods": 5,
      "balance": 7.50,
      "status": "online",
      "role": "client"
    }
  ]
}
```

**Casos de uso**:
- Lista de usuarios en `/admin/users`
- Gestión y soporte de usuarios

---

### **POST** `/api/auth/users/balance`
**Descripción**: Actualizar saldo de un usuario (solo administradores)

**Headers requeridos**:
```
Authorization: Bearer <admin_token>
```

**Payload**:
```json
{
  "userId": "user_uuid_1",
  "balance": 25.00
}
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Saldo actualizado correctamente",
  "data": {
    "userId": "user_uuid_1",
    "newBalance": 25.00
  }
}
```

**Casos de uso**:
- Asignar saldo desde `/admin/users`
- Recarga manual de cuentas de usuario

---

## 🔧 Configuración del Cliente API

### Interceptores de Request
```javascript
// Añadir token JWT automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Interceptores de Response
```javascript
// Manejo automático de errores 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 🎭 Modo de Simulación

### Activación Automática
El modo de simulación se activa automáticamente cuando:
- `import.meta.env.DEV === true`
- Backend no responde (timeout, conexión rechazada)
- Error de conexión (`error.isConnectionError === true`)

### Endpoints Simulados
Todos los endpoints tienen respuestas simuladas predefinidas para desarrollo y demostración.

### Detección de Simulación
```javascript
// Verificar si el backend está disponible
try {
  await api.get('/api/status/public');
  // Backend disponible - usar APIs reales
} catch (error) {
  if (error.isConnectionError) {
    // Backend no disponible - activar simulación
    return getSimulatedData();
  }
}
```

---

## 📞 Soporte y Resolución de Problemas

### Errores Comunes

**Error de conexión**:
- Verificar que el backend esté ejecutándose en `http://localhost:3000`
- Comprobar la variable `VITE_API_URL`

**Error 401 - No autorizado**:
- Token expirado - cerrar sesión e iniciar nuevamente
- Token inválido - limpiar localStorage

**Error 403 - Sin permisos**:
- Usuario sin rol adecuado para la operación
- Verificar que el usuario sea administrador para endpoints admin

### Logs de Depuración
Todos los servicios incluyen logs detallados en la consola del navegador para facilitar la depuración.

---

**Esta documentación está sincronizada con el código actual del frontend de NeuroPod y se actualiza según los cambios en la implementación.**
