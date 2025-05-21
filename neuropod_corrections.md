# 🔧 NeuroPod - Correcciones de Inconsistencias y Especificaciones Definitivas

## 🌐 Sistema de Subdominios - ESPECIFICACIÓN CORREGIDA

### **Concepto Principal:**
Cada pod puede exponer **múltiples puertos HTTP**, y **cada puerto necesita su propio subdominio único**.

### **Formato Definitivo de Subdominios:**
```bash
{pod-name}-{user-hash}-{port}.neuropod.online
```

### **Ejemplos Correctos:**
```bash
# Pod "mi-pod-test" del usuario "usr123" con puertos 8888, 3000, 7860
mi-pod-test-usr123-8888.neuropod.online  # Jupyter Lab
mi-pod-test-usr123-3000.neuropod.online  # Web Server
mi-pod-test-usr123-7860.neuropod.online  # Servicio personalizado
```

## 🎯 **Razón de los Dos Formatos y Unificación**

### **Diferencia Original:**
- **POST /api/pods** → Respuesta al **crear** el pod (formato 1)
- **GET /api/pods/:id/connections** → Respuesta para **conectar** al pod (formato 2)

### **Problema Identificado:**
Los dos endpoints tenían estructuras diferentes para la misma información, causando:
- ❌ Inconsistencia en el frontend
- ❌ Duplicación de lógica de parsing
- ❌ Confusión en el desarrollo

### **Solución: Formato Unificado**
✅ **Usar el segundo formato en ambos endpoints** porque:
1. **Más directo**: `httpServices[]` y `tcpServices[]` sin anidamiento extra
2. **Incluye status**: Cada servicio tiene su propio estado (`creating`, `ready`, `error`)
3. **Mejor para frontend**: Más fácil de mapear en componentes React
4. **Escalable**: Fácil agregar nuevos campos por servicio

### **Cambios Específicos:**
- ✅ `id` → `podId` (consistente con connections)
- ✅ `name` → `podName` (consistente con connections)  
- ✅ `services.http[]` → `httpServices[]` (formato plano)
- ✅ `services.tcp[]` → `tcpServices[]` (formato plano)
- ✅ Agregado `status` individual por servicio

---

## 🔗 API de Pods - ESPECIFICACIÓN CORREGIDA

### **Endpoint: POST /api/pods**

#### **Payload (NO CAMBIOS):**
```javascript
{
  "name": "mi-pod-test",
  "deploymentType": "template", // o "docker"
  "template": "template_uuid_1", // solo si deploymentType === "template"
  "dockerImage": "ubuntu:22.04", // solo si deploymentType === "docker"
  "gpu": "rtx-4050",
  "containerDiskSize": 10,
  "volumeDiskSize": 20,
  "ports": "8888, 3000, 7860",
  "enableJupyter": true,
  "assignToUser": "usuario@email.com" // solo en admin
}
```

#### **Respuesta UNIFICADA:**
```javascript
{
  "success": true,
  "data": {
    "podId": "pod_uuid_1",
    "podName": "mi-pod-test",
    "status": "creating",
    "createdAt": "2025-01-20T10:30:00Z",
    
    // ✅ FORMATO UNIFICADO: Igual que /connections
    "httpServices": [
      {
        "port": 8888,
        "serviceName": "Jupyter Lab",
        "url": "https://mi-pod-test-usr123-8888.neuropod.online",
        "isCustom": false,
        "status": "creating"
      },
      {
        "port": 3000,
        "serviceName": "Web Server", 
        "url": "https://mi-pod-test-usr123-3000.neuropod.online",
        "isCustom": false,
        "status": "creating"
      },
      {
        "port": 7860,
        "serviceName": "Servicio 3",
        "url": "https://mi-pod-test-usr123-7860.neuropod.online",
        "isCustom": true,
        "status": "creating"
      }
    ],
    "tcpServices": [
      {
        "port": 22,
        "serviceName": "SSH",
        "url": "tcp://mi-pod-test-usr123-22.neuropod.online:22",
        "isCustom": false,
        "status": "creating"
      }
    ]
  }
}
```

---

## 🎯 Proceso de Generación de URLs - DEFINITIVO

### **Función Backend para Generar Servicios:**
```javascript
function generatePodServices(podConfig, processedPorts) {
  const { name: podName, userId } = podConfig;
  const userHash = generateUserHash(userId); // ej: "usr123"
  
  const httpServices = processedPorts.map(portConfig => ({
    port: portConfig.port,
    serviceName: portConfig.serviceName,
    url: `https://${podName}-${userHash}-${portConfig.port}.neuropod.online`,
    isCustom: portConfig.isCustom
  }));
  
  return {
    http: httpServices,
    tcp: [] // Por ahora decorativo
  };
}

function generateUserHash(userId) {
  // Generar hash corto del userId para el subdominio
  return `usr${userId.substring(0, 6)}`;
}
```

### **Ejemplo de Procesamiento Completo:**
```javascript
// Input del frontend
const frontendPayload = {
  "name": "mi-pod-test",
  "deploymentType": "template",
  "template": "template_uuid_1",
  "ports": "8888, 3000, 7860",
  "enableJupyter": true
};

// Procesamiento en backend
const processedPorts = await processPortsForTemplate(
  frontendPayload.template, 
  frontendPayload.ports, 
  frontendPayload.enableJupyter
);
// Resultado: [
//   { port: 8888, serviceName: "Jupyter Lab", isCustom: false },
//   { port: 3000, serviceName: "Web Server", isCustom: false },  
//   { port: 7860, serviceName: "Servicio 3", isCustom: true }
// ]

const services = generatePodServices(frontendPayload, processedPorts);
// Resultado: URLs como se muestra arriba

// Crear recursos en Kubernetes
await createKubernetesResources(frontendPayload, services);

// Guardar en MongoDB
await savePodToDatabase(frontendPayload, services);
```

---

## 🏗️ Implementación en Kubernetes - CORREGIDA

### **Recursos por Pod:**
```
1 Pod principal
N Services (uno por puerto HTTP)
N Ingress (uno por puerto HTTP)
```

### **Ejemplo con 3 puertos:**
```bash
# Pod principal
mi-pod-test-usr123-16839245  

# Services
mi-pod-test-usr123-8888-service
mi-pod-test-usr123-3000-service  
mi-pod-test-usr123-7860-service

# Ingress
mi-pod-test-usr123-8888-ingress
mi-pod-test-usr123-3000-ingress
mi-pod-test-usr123-7860-ingress
```

### **Template de Service por Puerto:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: ${podName}-${userHash}-${port}-service
  namespace: default
  labels:
    app: ${podName}
    user: ${userId}
    port: "${port}"
spec:
  selector:
    app: ${podName}
    user: ${userId}
  ports:
  - port: 80
    targetPort: ${port}
    protocol: TCP
  type: ClusterIP
```

### **Template de Ingress por Puerto:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${podName}-${userHash}-${port}-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: ${podName}-${userHash}-${port}.neuropod.online
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${podName}-${userHash}-${port}-service
            port:
              number: 80
```

---

## 📊 Base de Datos - Modelo Pod ACTUALIZADO

```javascript
const PodSchema = {
  podId: "pod_uuid_1", // ✅ UNIFICADO: Usar podId y podName
  podName: "mi-pod-test",
  userId: "user_uuid_1",
  userHash: "usr123", // ✅ NUEVO: Para generar subdominios
  
  // Configuración de despliegue
  deploymentType: "template", // o "docker"
  templateId: "template_uuid_1", // si es template
  dockerImage: "ubuntu:22.04",
  gpu: "rtx-4050",
  containerDiskSize: 10,
  volumeDiskSize: 20,
  enableJupyter: true,
  
  // Estado actual
  status: "creating", // creating, running, stopped, error
  
  // ✅ UNIFICADO: Mismo formato que API responses
  httpServices: [
    {
      port: 8888,
      serviceName: "Jupyter Lab",
      url: "https://mi-pod-test-usr123-8888.neuropod.online",
      isCustom: false,
      status: "creating", // creating, ready, error
      kubernetesServiceName: "mi-pod-test-usr123-8888-service",
      kubernetesIngressName: "mi-pod-test-usr123-8888-ingress"
    },
    {
      port: 3000,
      serviceName: "Web Server",
      url: "https://mi-pod-test-usr123-3000.neuropod.online", 
      isCustom: false,
      status: "creating",
      kubernetesServiceName: "mi-pod-test-usr123-3000-service",
      kubernetesIngressName: "mi-pod-test-usr123-3000-ingress"
    },
    {
      port: 7860,
      serviceName: "Servicio 3",
      url: "https://mi-pod-test-usr123-7860.neuropod.online",
      isCustom: true,
      status: "creating",
      kubernetesServiceName: "mi-pod-test-usr123-7860-service",
      kubernetesIngressName: "mi-pod-test-usr123-7860-ingress"
    }
  ],
  tcpServices: [],
  
  // Metadatos
  createdAt: new Date(),
  lastActive: new Date(),
  
  // Kubernetes info
  kubernetesResources: {
    podName: "mi-pod-test-usr123-16839245",
    pvcName: "workspace-usr123", // Compartido por usuario
    namespace: "default"
  }
};
```

---

## 🔌 API de Conexiones - DEFINITIVA

### **Endpoint: GET /api/pods/:id/connections**

```javascript
// ✅ UNIFICADO: Ambos endpoints usan el mismo formato
const standardizedServiceResponse = {
  "success": true,
  "data": {
    "podId": "pod_uuid_1",
    "podName": "mi-pod-test", 
    "status": "running", // Estado general del pod
    
    "httpServices": [
      {
        "port": 8888,
        "serviceName": "Jupyter Lab",
        "url": "https://mi-pod-test-usr123-8888.neuropod.online",
        "isCustom": false,
        "status": "ready" // Estado individual del servicio
      }
    ],
    "tcpServices": [
      {
        "port": 22,
        "serviceName": "SSH", 
        "url": "tcp://mi-pod-test-usr123-22.neuropod.online:22",
        "isCustom": false,
        "status": "ready"
      }
    ]
  }
};

// POST /api/pods RESPUESTA (después de crear)
const createResponse = {
  ...standardizedServiceResponse,
  "data": {
    ...standardizedServiceResponse.data,
    "status": "creating",
    "createdAt": "2025-01-20T10:30:00Z",
    "httpServices": standardizedServiceResponse.data.httpServices.map(s => ({
      ...s,
      "status": "creating" // Todos en creating al principio
    }))
  }
};

// GET /api/pods/:id/connections RESPUESTA (cuando se conecta)
const connectionsResponse = {
  ...standardizedServiceResponse,
  "data": {
    ...standardizedServiceResponse.data,
    "status": "running",
    "httpServices": standardizedServiceResponse.data.httpServices.map(s => ({
      ...s,
      "status": "ready" // Ya están listos para conexión
    }))
  }
};
```

#### **Respuesta para Pod Stopped:**
```javascript
{
  "success": true,
  "data": {
    "podId": "pod_uuid_1",
    "podName": "mi-pod-test",
    "status": "stopped",
    "message": "El pod está detenido. Inicia el pod para acceder a los servicios.",
    "httpServices": [],
    "tcpServices": []
  }
}
```