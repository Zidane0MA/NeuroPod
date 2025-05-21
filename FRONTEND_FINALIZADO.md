

### **Lógica de Asignación de Nombres de Servicio**

#### **Caso 1: Template Seleccionado**
```javascript
// En el backend al crear el pod
function assignServiceNames(userPorts, templatePorts, enableJupyter) {
  const result = [];
  const userPortsArray = userPorts.split(',').map(p => parseInt(p.trim()));
  
  userPortsArray.forEach((port, index) => {
    // 1. Buscar match exacto en template
    const templateMatch = templatePorts.find(tp => tp.port === port);
    if (templateMatch) {
      result.push({
        port: port,
        serviceName: templateMatch.serviceName,
        isCustom: false
      });
      return;
    }
    
    // 2. Si es puerto 8888 y Jupyter está habilitado
    if (port === 8888 && enableJupyter) {
      result.push({
        port: 8888,
        serviceName: "Jupyter Lab",
        isCustom: false
      });
      return;
    }
    
    // 3. Puerto personalizado agregado por usuario
    result.push({
      port: port,
      serviceName: `Servicio ${index + 1}`,
      isCustom: true
    });
  });
  
  return result;
}
```

#### **Caso 2: Imagen Docker Personalizada**
```javascript
function assignServiceNamesDocker(userPorts, enableJupyter) {
  const result = [];
  const userPortsArray = userPorts.split(',').map(p => parseInt(p.trim()));
  
  userPortsArray.forEach((port, index) => {
    // Si es puerto 8888 y Jupyter está habilitado
    if (port === 8888 && enableJupyter) {
      result.push({
        port: 8888,
        serviceName: "Jupyter Lab",
        isCustom: false
      });
      return;
    }
    
    // Para todos los demás puertos
    result.push({
      port: port,
      serviceName: `Servicio ${index + 1}`,
      isCustom: true
    });
  });
  
  return result;
}
```

#### **Algoritmo Completo de Matching:**
```javascript
// Función principal en el backend
function generatePodServices(podConfig) {
  const { deploymentType, template, ports, enableJupyter } = podConfig;
  
  if (deploymentType === "template") {
    const templateData = await Template.findById(template);
    return assignServiceNames(ports, templateData.httpPorts, enableJupyter);
  } else {
    return assignServiceNamesDocker(ports, enableJupyter);
  }
}
```

---

## 🌐 Sistema de Subdominios - ESPECIFICACIÓN DETALLADA

### **Arquitectura de Subdominios**

**Concepto Clave**: Cada puerto HTTP expuesto debe tener su propio subdominio único.

#### **Formato de Subdominios:**
```
{pod-name}-{user-hash}-{port}.neuropod.online
```

**Funcion para generar user-hash**
```javascript
function generateUserHash(userId) {
  // Generar hash corto del userId para el subdominio
  return `usr${userId.substring(0, 6)}`;
}
```

**Ejemplos:**
- `mi-pod-usr123-8888.neuropod.online` (Jupyter Lab)
- `mi-pod-usr123-3000.neuropod.online` (Web Server)
- `mi-pod-usr123-7860.neuropod.online` (Servicio personalizado)

### **Implementación en Kubernetes**

#### **1. Service por Puerto**
```yaml
# Crear un Service separado para cada puerto
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

#### **2. Ingress por Puerto**
```yaml
# Crear un Ingress separado para cada puerto
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

#### **3. Función de Creación de Recursos**
```javascript
// En el backend
async function createKubernetesResources(podConfig, servicesList) {
  const { podName, userId, dockerImage } = podConfig;
  
  // 1. Crear el Pod principal
  await createMainPod(podConfig);
  
  // 2. Crear Service + Ingress para cada puerto
  for (const service of servicesList) {
    await createServiceForPort({
      podName,
      userId,
      port: service.port,
      serviceName: service.serviceName
    });
    
    await createIngressForPort({
      podName,
      userId,
      port: service.port,
      subdomain: `${podName}-${generateUserHash(userId)}-${service.port}.neuropod.online`
    });
  }
}
```

### **Base de Datos - Estructura de Pod**
```javascript
// Modelo de Pod en MongoDB
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
  tcpServices: [
      {
        port: 22,
        serviceName: "SSH",
        url: "tcp://mi-pod-test-usr123-22.neuropod.online:22", // No funcional, no pensado en implementar
        isCustom: false
      }
    ],
  
  // Metadatos
  createdAt: new Date(),
  lastActive: new Date(),
  
  // Kubernetes info
  kubernetesResources: {
    podName: "mi-pod-test-usr123-16839245",
    pvcName: "/workspace", // por defecto para usuario, solo se puede modificar en las plantillas
    namespace: "default"
  }
};
```

### **DNS Wildcard Configuration**

#### **En Cloudflare:**
```
Tipo: CNAME
Nombre: *.neuropod.online
Destino: tunnel-id.cfargotunnel.com
Proxy: Sí
```

#### **En NGINX Ingress Controller:**
```yaml
# ConfigMap para NGINX
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  server-name-hash-bucket-size: "256"
  proxy-buffer-size: "16k"
  use-forwarded-headers: "true"
```

### **Proceso Completo de Despliegue**

**Caso:** Usuario elige template (contiene 2 puertos) y agrega 1 puerto extra

#### **1. Usuario hace deploy desde frontend:**
```javascript
// POST /api/pods - Payload COMPLETO - Ver casos en payload_explanation.md
{
  // 🔧 CONFIGURACIÓN BÁSICA (siempre requerido)
  "name": "mi-pod-test",
  "gpu": "rtx-4050",
  "containerDiskSize": 20,
  "volumeDiskSize": 50,
  "ports": "8888, 3000, 7860",
  "enableJupyter": true,

  // 🎯 TIPO DE DESPLIEGUE (uno de los dos)
  "deploymentType": "template", // o "imagen docker"
  
  // Si deploymentType === "template"
  "template": "template_uuid_1",
  
  // Si deploymentType === "imagen docker" 
  "dockerImage": "ubuntu:22.04",

  // 👤 ASIGNACIÓN DE USUARIO (solo disponible para admin)
  "assignToUser": "cliente@email.com"
}
```

#### **2. Backend procesa y genera servicios:**
```javascript
// Resultado del processing
const services = [
  { port: 8888, serviceName: "Jupyter Lab", isCustom: false },  // Del template
  { port: 3000, serviceName: "Web Server", isCustom: false },   // Del template
  { port: 7860, serviceName: "Servicio 3", isCustom: true }     // Agregado por usuario
];
```

#### **3. Se crean recursos en Kubernetes:**
- 1 Pod principal
- 3 Services (uno por puerto)
- 3 Ingress (uno por puerto)
- 3 subdominios únicos

#### **4. URLs finales generadas:**
- `https://mi-pod-test-usr123-8888.neuropod.online` → Jupyter Lab
- `https://mi-pod-test-usr123-3000.neuropod.online` → Web Server
- `https://mi-pod-test-usr123-7860.neuropod.online` → Servicio 3

### **Manejo de Estados**

#### **Cuando pod está detenido:**
```javascript
// Respuesta de /api/pods/:id/connections para pod detenido
{
  "success": true,
  "data": {
    "podId": "pod_uuid_1",
    "status": "stopped",
    "message": "El pod está detenido. Inicia el pod para acceder a los servicios.",
    "httpServices": [],
    "tcpServices": []
  }
}
```

#### **Cuando pod está iniciando:**
```javascript
{
  "success": true,
  "data": {
    "podId": "pod_uuid_1",
    "status": "starting",
    "message": "El pod se está iniciando. Los servicios estarán disponibles en breve.",
    "httpServices": [
      {
        "port": 8888,
        "serviceName": "Jupyter Lab",
        "url": "https://mi-pod-test-usr123-8888.neuropod.online",
        "status": "starting"
      }
    ]
  }
}
```

---

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

### 2. **API de Pods** - `PRIORIDAD ALTA`

#### **Endpoint: POST /api/pods**
```javascript
// Payload enviado desde '/Pods/Deploy'
{
  "name": "mi-pod-test",
  "deploymentType": "template", // o "docker"
  "template": "template_uuid_1", // solo si deploymentType === "template"
  "dockerImage": "ubuntu:22.04", // solo si deploymentType === "docker"
  "gpu": "rtx-4050",
  "containerDiskSize": 10,
  "volumeDiskSize": 20,
  "ports": "8888, 3000",
  "enableJupyter": true,
  "assignToUser": "usuario@email.com" // solo en admin
}
```

#### **Respuesta Esperada:**
```javascript
{
  "success": true,
  "data": {
    "id": "pod_uuid_1",
    "name": "mi-pod-test",
    "status": "creating",
    "createdAt": "2025-01-20T10:30:00Z",
    
    // ✅ CORREGIDO: Array de URLs, una por puerto
    "services": {
      "http": [
        {
          "port": 8888,
          "serviceName": "Jupyter Lab",
          "url": "https://mi-pod-test-usr123-8888.neuropod.online",
          "isCustom": false
        },
        {
          "port": 3000,
          "serviceName": "Web Server", 
          "url": "https://mi-pod-test-usr123-3000.neuropod.online",
          "isCustom": false
        },
        {
          "port": 7860,
          "serviceName": "Servicio 3",
          "url": "https://mi-pod-test-usr123-7860.neuropod.online",
          "isCustom": true
        }
      ],
      "tcp": [
        {
          "port": 22,
          "serviceName": "SSH",
          "url": "tcp://mi-pod-test-usr123-22.neuropod.online:22", // URL no funcional
          "isCustom": false
        }
      ]
    }
  }
}
```

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

---

### 6. **Integración con Kubernetes** - `PRIORIDAD ALTA`

#### **Recursos a Crear Dinámicamente:**

**Usar**: @kubernetes/client-node

##### **PersistentVolumeClaim:**
```yaml
# Crear uno por usuario si no existe
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: workspace-${userId}
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: "${volumeDiskSize}Gi"
```

##### **Pod:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ${podName}-${userId}-${timestamp}
  labels:
    app: ${podName}
    user: ${userId}
    type: ${containerType}
spec:
  containers:
  - name: main
    image: ${dockerImage}
    ports: ${httpPorts.map(port => ({ containerPort: port }))}
    resources:
      limits:
        memory: "${containerDiskSize}Gi"
        nvidia.com/gpu: 1
    volumeMounts:
    - name: workspace
      mountPath: /workspace
  volumes:
  - name: workspace
    persistentVolumeClaim:
      claimName: workspace-${userId}
```

##### **Service:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: ${podName}-service
spec:
  selector:
    app: ${podName}
  ports: ${httpPorts.map(port => ({ port: 80, targetPort: port }))}
```

##### **Ingress:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${podName}-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: ${subdomain}.neuropod.online
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${podName}-service
            port:
              number: 80
```

---

### 7. **Monitoreo y Estados** - `PRIORIDAD BAJA`

#### **Estados de Pod:**
- `creating` - Se está creando en Kubernetes
- `running` - Pod activo y funcionando
- `stopped` - Pod detenido
- `error` - Error en la creación/ejecución

#### **Métricas a Recopilar:**
```javascript
// Para mostrar en el frontend
{
  "podId": "pod_uuid_1",
  "status": "running",
  "containerDiskSize": "10",
  "volumeDiskSize": "20",
  "activeTime": "2h 45m",
  "cpu": "45%",
  "memory": "1.2GB / 2GB",
  "gpu": "65%"
  "logs": "...."
}
```

---

## 🚀 Proceso de Implementación Recomendado

### **Fase 1: APIs Básicas** (1-2 días)
1. ✅ Implementar API de templates (CRUD completo)
2. ✅ Implementar API básica de pods (crear, listar)
3. ✅ Conectar frontend con templates

### **Fase 2: Kubernetes Integration** (3-5 días)
1. ✅ Implementar creación de pods en Kubernetes
2. ✅ Implementar generación de subdominios dinámicos
3. ✅ Configurar PVC para almacenamiento persistente
4. ✅ Probar despliegue end-to-end

### **Fase 3: Funcionalidades Avanzadas** (2-3 días)
1. ✅ Implementar sistema de precios dinámico
2. ✅ Gestión de estados de pods (start/stop/delete)
3. ✅ Sistema de logs y monitoreo básico

### **Fase 4: Optimización** (1-2 días)
1. ✅ WebSockets para actualizaciones en tiempo real
2. ✅ Sistema de métricas de uso
3. ✅ Optimización de rendimiento

---

## 📝 Archivos de Configuración Necesarios

### **Backend .env:**
```env
# Kubernetes
KUBE_CONFIG_PATH=/path/to/kubeconfig
KUBERNETES_NAMESPACE=default

# Dominio
DOMAIN=neuropod.online
NODE_ENV=production  # o development para port-forward

# Base de datos
MONGODB_URI=mongodb://localhost:27017/plataforma

# JWT
JWT_SECRET=your_secret_here
JWT_EXPIRE=24h
```

### **Kubernetes ConfigMap:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: neuropod-config
data:
  domain: "neuropod.online"
  defaultStorageClass: "standard"
  maxPodsPerUser: "5"
```

---

## 🎯 Criterios de Éxito

### **Funcionalidades Críticas que Deben Funcionar:**
1. ✅ **Crear template desde /admin/templates** → Ver en modal de PodDeploy
2. ✅ **Seleccionar template** → Auto-llenar campos sin perder configuración
3. ✅ **Desplegar pod** → Generar URL accesible
4. ✅ **Admin asignar pod** → Aparece en /client/pods del usuario
5. ✅ **Validación de saldo** → Prevenir despliegue si insuficiente
6. ✅ **Jupyter Lab** → Funcionar según configuración del template

### **URLs de Prueba:**
- Templates: `GET http://localhost:3000/api/templates`
- Crear pod: `POST http://localhost:3000/api/pods`
- URL generada: `https://mi-pod-test-usr123-8888.neuropod.online`

---

**Estado**: ✅ **Frontend completado y listo para integración con backend**

El frontend está **100% funcional** para el flujo completo. Todos los formularios, validaciones, modales y estados están implementados. Solo falta la implementación del backend según estas especificaciones para tener el sistema completamente operativo.
