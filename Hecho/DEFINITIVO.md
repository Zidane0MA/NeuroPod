# Plan de Implementación para Neuropod en Windows

## Arquitectura y Configuración Base

### Arquitectura de Red del proyecto

La arquitectura de red está diseñada de la siguiente manera:

```
                                🌐 Internet
                                      |
                        +-------------+------------------------+
                        |                                      |
         DNS Wildcard (*.neuropod.online)                      |
                        |                                      |
            +-------------------------+                        |
            |                         |                        |
            v                         v                        v
    app.neuropod.onlin        api.neuropod.online       *.neuropod.online
        (Frontend)               (Backend API)          (Pods de Usuario)
            |                         |                        |
            v                         v                        v
+-----------------------+--- Cloudflare Tunnel ---+-------------------------+
|    localhost:5173     |     localhost:3000      |      localhost:443      |
```

### Configuración NGINX Ingress Controller

Las configuraciones de NGINX que mencionaste son cruciales para el funcionamiento correcto del sistema:

```yaml
# ConfigMap para NGINX
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  server-name-hash-bucket-size: "256"  # Permite manejar nombres de servidor (subdominios) largos
  proxy-buffer-size: "16k"             # Mejora el manejo de cabeceras HTTP grandes
  use-forwarded-headers: "true"        # Importante para trabajar con Cloudflare Tunnel
```

**Explicación:**
1. ``server-name-hash-bucket-size``: Permite manejar subdominios largos como los que generarás (ej: mi-pod-test-u1a2b3c4-8888.neuropod.online)
2. ``proxy-buffer-size``: Necesario para cabeceras HTTP más grandes, que son comunes cuando se trabaja con tokens de autenticación
3. ``use-forwarded-headers``: Asegura que las peticiones mantengan su origen cuando pasan por Cloudflare Tunnel

### Kubernetes ConfigMap para Neuropod

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: neuropod-config
data:
  domain: "neuropod.online"            # Dominio base para todos los subdominios
  defaultStorageClass: "standard"      # Tipo de almacenamiento a usar por defecto
  maxPodsPerUser: "5"                  # Límite de pods por usuario
```

### IngressClass Dedicada

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: neuropod-nginx
  annotations:
    ingressclass.kubernetes.io/is-default-class: "true"
spec:
  controller: k8s.io/ingress-nginx
```

Esta configuración es importante para asegurarte de que todos los Ingress que crees usen el controlador NGINX adecuado.

## Solución para el Manejo de Subdominios y Servicios

### Problema con la Arquitectura Actual

**El principal problema identificado es:**
1. Estás usando port: 80 en los Services y luego redirigiendo a los puertos específicos, lo que puede causar problemas con servicios como Jupyter Lab que generan tokens de autenticación.
2. La configuración actual no permite acceder fácilmente a los logs específicos por servicio.

### Solución Mejorada para Ingress y Services

Para resolver estos problemas, modificaré la estrategia:

#### Service por Puerto (modificado)
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
  - port: ${port}            # Importante: mantiene el puerto original
    targetPort: ${port}      # Se conecta al mismo puerto en el contenedor
    protocol: TCP
  type: ClusterIP
```

#### Ingress por Puerto (modificado)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${podName}-${userHash}-${port}-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "neuropod-nginx"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    # Configuración crítica para WebSockets (Jupyter Lab)
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
    nginx.ingress.kubernetes.io/keep-alive: "75"
    nginx.ingress.kubernetes.io/keep-alive-requests: "100"
spec:
  rules:
  - host: ${safePodName}-${userHash}-${safePort}.neuropod.online
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${podName}-${userHash}-${port}-service
            port:
              number: ${port}  # Usa el puerto original, no 80!
```

### Configuración de tolerancias para pods con GPU

```yaml
# Modifica el como se crean los pods para incluir
tolerations:
- key: nvidia.com/gpu
  operator: Exists
  effect: NoSchedule
```

### Función JavaScript Mejorada para Crear Resources

```javascript
// Función para crear todos los recursos necesarios para un pod
async function createPodWithServices(podConfig) {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  const k8sNetworkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
  
  const { name: podName, userId, dockerImage, ports, containerDiskSize, volumeDiskSize } = podConfig;
  const userHash = generateUserHash(userId);
  
  // 1. Crear o verificar PVC para el usuario
  await createOrVerifyUserPVC(userId, volumeDiskSize);
  
  // 2. Crear el Pod principal
  const pod = {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name: `${podName}-${userHash}`,
      labels: {
        app: podName,
        user: userId
      }
    },
    spec: {
      containers: [{
        name: 'main',
        image: dockerImage,
        ports: ports.map(port => ({ containerPort: parseInt(port) })),
        resources: {
          limits: {
            memory: `${containerDiskSize}Gi`,
            cpu: '2',
            'nvidia.com/gpu': podConfig.gpu.includes('rtx') ? '1' : '0'
          }
        },
        volumeMounts: [{
          name: 'workspace',
          mountPath: '/workspace'
        }]
      }],
      volumes: [{
        name: 'workspace',
        persistentVolumeClaim: {
          claimName: `workspace-${userHash}`
        }
      }]
    }
  };
  
  try {
    await k8sApi.createNamespacedPod('default', pod);
    console.log(`Pod ${podName}-${userHash} creado exitosamente`);
    
    // 3. Crear Service e Ingress para cada puerto
    const portsArray = ports.split(',').map(p => parseInt(p.trim()));
    
    for (const port of portsArray) {
      // Crear Service para este puerto
      await createServiceForPort(podName, userHash, userId, port);
      
      // Crear Ingress para este puerto
      const subdomain = generateSecureSubdomain(podName, userId, port);
      await createIngressForPort(podName, userHash, port, subdomain);
    }
    
    // 4. Monitorear estado del pod para actualizar estados en base de datos
    watchPodStatus(podName, userHash, userId, portsArray);
    
    return {
      podName: `${podName}-${userHash}`,
      status: 'creating'
    };
  } catch (error) {
    console.error(`Error al crear pod ${podName}:`, error);
    throw error;
  }
}

// Función para crear o verificar el PVC del usuario
async function createOrVerifyUserPVC(userId, volumeDiskSize) {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  const userHash = generateUserHash(userId);
  
  const pvcName = `workspace-${userHash}`;
  
  try {
    // Verificar si ya existe
    await k8sApi.readNamespacedPersistentVolumeClaim(pvcName, 'default');
    console.log(`PVC ${pvcName} ya existe, usando el existente`);
    return;
  } catch (error) {
    // Si no existe, crearlo
    if (error.statusCode === 404) {
      const pvc = {
        apiVersion: 'v1',
        kind: 'PersistentVolumeClaim',
        metadata: {
          name: pvcName
        },
        spec: {
          accessModes: ['ReadWriteMany'],
          resources: {
            requests: {
              storage: `${volumeDiskSize}Gi`
            }
          },
          storageClassName: 'standard'
        }
      };
      
      await k8sApi.createNamespacedPersistentVolumeClaim('default', pvc);
      console.log(`PVC ${pvcName} creado exitosamente`);
    } else {
      throw error;
    }
  }
}

// Función para crear un Service para un puerto específico
async function createServiceForPort(podName, userHash, userId, port) {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  
  const service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: `${podName}-${userHash}-${port}-service`,
      labels: {
        app: podName,
        user: userId,
        port: `${port}`
      }
    },
    spec: {
      selector: {
        app: podName,
        user: userId
      },
      ports: [{
        port: port,
        targetPort: port,
        protocol: 'TCP'
      }],
      type: 'ClusterIP'
    }
  };
  
  await k8sApi.createNamespacedService('default', service);
  console.log(`Service ${podName}-${userHash}-${port}-service creado`);
}

// Función para crear un Ingress para un puerto específico
async function createIngressForPort(podName, userHash, port, subdomain) {
  const k8sNetworkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
  
  const ingress = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name: `${podName}-${userHash}-${port}-ingress`,
      annotations: {
        'kubernetes.io/ingress.class': 'neuropod-nginx',
        'nginx.ingress.kubernetes.io/proxy-read-timeout': '3600',
        'nginx.ingress.kubernetes.io/proxy-send-timeout': '3600',
        'nginx.ingress.kubernetes.io/proxy-http-version': '1.1',
        'nginx.ingress.kubernetes.io/configuration-snippet': `
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
        `
      }
    },
    spec: {
      rules: [{
        host: subdomain,
        http: {
          paths: [{
            path: '/',
            pathType: 'Prefix',
            backend: {
              service: {
                name: `${podName}-${userHash}-${port}-service`,
                port: {
                  number: port  // Importante: usar el puerto original
                }
              }
            }
          }]
        }
      }]
    }
  };
  
  await k8sNetworkingApi.createNamespacedIngress('default', ingress);
  console.log(`Ingress ${podName}-${userHash}-${port}-ingress creado para ${subdomain}`);
}
```

### Captura del Token de Jupyter Lab

La principal complicación con Jupyter Lab es que genera un token de acceso aleatorio al iniciar. Necesitamos capturar ese token y proporcionarlo al usuario:

```javascript
// Función para capturar el token de Jupyter Lab
async function captureJupyterToken(podName, userHash) {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  
  // Esperar a que el pod esté en estado 'Running'
  let podRunning = false;
  while (!podRunning) {
    const { body } = await k8sApi.readNamespacedPod(`${podName}-${userHash}`, 'default');
    if (body.status.phase === 'Running') {
      podRunning = true;
    } else {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
    }
  }
  
  // Obtener logs del contenedor para extraer el token
  try {
    const { body: logs } = await k8sApi.readNamespacedPodLog(
      `${podName}-${userHash}`, 
      'default',
      'main',  // Nombre del contenedor
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      500  // Obtener últimas 500 líneas
    );
    
    // Regex para encontrar el token de Jupyter
    const jupyterTokenMatch = logs.match(/token=([a-f0-9]+)/);
    if (jupyterTokenMatch && jupyterTokenMatch[1]) {
      const token = jupyterTokenMatch[1];
      console.log(`Token de Jupyter Lab encontrado: ${token}`);
      
      // Actualizar la entrada en la base de datos
      await updateJupyterTokenInDb(podName, userHash, token);
      
      return token;
    } else {
      console.log('No se encontró token de Jupyter en los logs');
      return null;
    }
  } catch (error) {
    console.error('Error al obtener logs para token de Jupyter:', error);
    return null;
  }
}

// Función para actualizar el token en la base de datos
async function updateJupyterTokenInDb(podName, userHash, token) {
  // Encontrar el pod en la base de datos
  const pod = await Pod.findOne({ 
    podName: podName,
    userHash: userHash
  });
  
  if (pod) {
    // Buscar el servicio de Jupyter (puerto 8888)
    const jupyterService = pod.httpServices.find(service => 
      service.port === 8888 && service.serviceName === 'Jupyter Lab');
    
    if (jupyterService) {
      // Actualizar la URL con el token
      jupyterService.url = `${jupyterService.url}?token=${token}`;
      jupyterService.jupyterToken = token;
      
      await pod.save();
      console.log(`Token de Jupyter actualizado en la base de datos para ${podName}`);
    }
  }
}
```

## Implementación del Backend

### Modelo de Pod en MongoDB
```javascript
const mongoose = require('mongoose');

const PodSchema = new mongoose.Schema({
  podId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => require('crypto').randomBytes(8).toString('hex')
  },
  podName: { 
    type: String, 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  userHash: { 
    type: String, 
    required: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Configuración de despliegue
  deploymentType: { 
    type: String, 
    enum: ['template', 'docker'], 
    required: true 
  },
  templateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Template' 
  },
  dockerImage: { 
    type: String 
  },
  gpu: { 
    type: String, 
    required: true 
  },
  containerDiskSize: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 50 
  },
  volumeDiskSize: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 150 
  },
  enableJupyter: { 
    type: Boolean, 
    default: true 
  },
  
  // Estado actual
  status: { 
    type: String, 
    enum: ['creating', 'running', 'stopped', 'error'], 
    default: 'creating' 
  },
  
  // Servicios
  httpServices: [{
    port: { type: Number, required: true },
    serviceName: { type: String, required: true },
    url: { type: String, required: true },
    isCustom: { type: Boolean, default: false },
    status: { 
      type: String, 
      enum: ['creating', 'ready', 'error', 'stopped'], 
      default: 'creating' 
    },
    jupyterToken: { type: String },
    kubernetesServiceName: { type: String },
    kubernetesIngressName: { type: String }
  }],
  
  tcpServices: [{
    port: { type: Number },
    serviceName: { type: String },
    url: { type: String },
    isCustom: { type: Boolean, default: false },
    status: { 
      type: String, 
      enum: ['creating', 'ready', 'error', 'stopped', 'disable'], 
      default: 'disable' 
    }
  }],
  
  // Metadatos
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastActive: { 
    type: Date, 
    default: Date.now 
  },
  
  // Kubernetes info
  kubernetesResources: {
    podName: { type: String },
    pvcName: { type: String },
    namespace: { type: String, default: 'default' }
  },
  
  // Estadísticas
  stats: {
    cpuUsage: { type: Number, default: 0 },
    memoryUsage: { type: Number, default: 0 },
    gpuUsage: { type: Number, default: 0 },
    uptime: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }
});

module.exports = mongoose.model('Pod', PodSchema);
```

### Controlador para Crear Pods

```javascript
const Pod = require('../models/Pod');
const User = require('../models/User');
const Template = require('../models/Template');
const { createPodWithServices, captureJupyterToken } = require('../services/kubernetes');
const { generateUserHash, generateSecureSubdomain } = require('../utils/podHelpers');

/**
 * Crea un nuevo pod
 */
exports.createPod = async (req, res) => {
  try {
    const currentUser = req.user; // Obtenido del middleware de autenticación
    
    // 1. Validar el payload
    const errors = await validatePodPayload(req.body, currentUser);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }
    
    // 2. Determinar el propietario del pod
    let podOwner;
    if (req.body.assignToUser && currentUser.role === "admin") {
      // Admin creando para un cliente
      podOwner = await User.findOne({ email: req.body.assignToUser });
    } else {
      // Usuario creando para sí mismo
      podOwner = currentUser;
    }
    
    // 3. Validar saldo (solo para clientes)
    if (podOwner.role === "client") {
      const estimatedCost = calculatePodCost(req.body);
      if (podOwner.balance < estimatedCost) {
        return res.status(400).json({
          success: false,
          message: `Saldo insuficiente. Requerido: €${estimatedCost}, Disponible: €${podOwner.balance}`
        });
      }
    }
    
    // 4. Generar userHash para el propietario
    const userHash = generateUserHash(podOwner._id.toString());
    
    // 5. Procesar puertos y servicios según deploymentType
    const portsArray = req.body.ports.split(',').map(p => parseInt(p.trim()));
    let httpServices = [];
    
    if (req.body.deploymentType === 'template') {
      const template = await Template.findById(req.body.template);
      httpServices = assignServiceNames(portsArray, template.httpPorts, req.body.enableJupyter);
    } else {
      httpServices = assignServiceNamesDocker(portsArray, req.body.enableJupyter);
    }
    
    // 6. Preparar servicios HTTP con URLs y estados
    const formattedHttpServices = httpServices.map(service => {
      const subdomain = generateSecureSubdomain(req.body.name, podOwner._id.toString(), service.port);
      return {
        port: service.port,
        serviceName: service.serviceName,
        url: `https://${subdomain}`,
        isCustom: service.isCustom,
        status: 'creating',
        kubernetesServiceName: `${req.body.name}-${userHash}-${service.port}-service`,
        kubernetesIngressName: `${req.body.name}-${userHash}-${service.port}-ingress`
      };
    });
    
    // 7. Preparar servicios TCP (decorativos)
    const tcpServices = [
      {
        port: 22,
        serviceName: 'SSH',
        url: `tcp://${req.body.name}-${userHash}-22.neuropod.online:22`,
        isCustom: false,
        status: 'disable'
      }
    ];
    
    // 8. Crear el pod en la base de datos
    const pod = await Pod.create({
      podId: require('crypto').randomBytes(8).toString('hex'),
      podName: req.body.name,
      userId: podOwner._id,
      userHash: userHash,
      createdBy: currentUser._id,
      
      // Configuración
      deploymentType: req.body.deploymentType,
      templateId: req.body.deploymentType === 'template' ? req.body.template : undefined,
      dockerImage: req.body.deploymentType === 'docker' ? req.body.dockerImage : 
                  (req.body.deploymentType === 'template' ? 
                   (await Template.findById(req.body.template)).dockerImage : undefined),
      gpu: req.body.gpu,
      containerDiskSize: req.body.containerDiskSize,
      volumeDiskSize: req.body.volumeDiskSize,
      enableJupyter: req.body.enableJupyter,
      
      // Servicios
      httpServices: formattedHttpServices,
      tcpServices: tcpServices,
      
      // Kubernetes
      kubernetesResources: {
        podName: `${req.body.name}-${userHash}`,
        pvcName: `workspace-${userHash}`,
        namespace: 'default'
      }
    });
    
    // 9. Crear los recursos en Kubernetes (asíncrono)
    createPodWithServices({
      name: req.body.name,
      userId: podOwner._id.toString(),
      dockerImage: pod.dockerImage,
      ports: req.body.ports,
      containerDiskSize: req.body.containerDiskSize,
      volumeDiskSize: req.body.volumeDiskSize,
      gpu: req.body.gpu,
      enableJupyter: req.body.enableJupyter
    })
    .then(() => {
      // 10. Si tiene Jupyter, capturar token (asíncrono)
      if (req.body.enableJupyter && portsArray.includes(8888)) {
        setTimeout(() => {
          captureJupyterToken(req.body.name, userHash)
            .catch(err => console.error('Error capturando token Jupyter:', err));
        }, 10000); // Esperar 10 segundos antes de buscar el token
      }
    })
    .catch(err => {
      console.error('Error creando recursos Kubernetes:', err);
      // Actualizar estado del pod a error
      Pod.findByIdAndUpdate(pod._id, { status: 'error' }).catch(console.error);
    });
    
    // 11. Descontar saldo si es cliente
    if (podOwner.role === 'client') {
      const cost = calculatePodCost(req.body);
      await User.findByIdAndUpdate(podOwner._id, { 
        $inc: { balance: -cost } 
      });
    }
    
    // 12. Responder al cliente
    return res.status(201).json({
      success: true,
      data: {
        podId: pod.podId,
        podName: pod.podName,
        status: pod.status,
        message: 'Pod creándose. Por favor espere unos minutos.'
      }
    });
    
  } catch (error) {
    console.error('Error al crear pod:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al crear el pod',
      error: error.message
    });
  }
};

// Función para validar el payload
async function validatePodPayload(payload, currentUser) {
  const errors = [];

  // Validaciones básicas
  if (!payload.name) errors.push("Nombre es requerido");
  if (!payload.gpu) errors.push("GPU es requerida");
  if (!payload.deploymentType) errors.push("Tipo de despliegue requerido");
  if (!payload.ports) errors.push("Puertos son requeridos");
  
  if (payload.containerDiskSize < 1 || payload.containerDiskSize > 50) {
    errors.push("Tamaño de disco de contenedor debe estar entre 1 y 50 GB");
  }
  
  if (payload.volumeDiskSize < 1 || payload.volumeDiskSize > 150) {
    errors.push("Tamaño de volumen debe estar entre 1 y 150 GB");
  }

  // Validación según tipo de despliegue
  if (payload.deploymentType === "template" && !payload.template) {
    errors.push("Template es requerido");
  }
  if (payload.deploymentType === "docker" && !payload.dockerImage) {
    errors.push("Imagen Docker es requerida");
  }

  // Validación de asignación de usuario
  if (payload.assignToUser) {
    // Solo admin puede asignar a otros usuarios
    if (currentUser.role !== "admin") {
      errors.push("Solo administradores pueden asignar pods a otros usuarios");
    }
    
    // Verificar que el usuario destino existe
    const targetUser = await User.findOne({ email: payload.assignToUser });
    if (!targetUser) {
      errors.push(`Usuario ${payload.assignToUser} no encontrado`);
    }
    
    // Verificar que el usuario destino es cliente
    if (targetUser && targetUser.role !== "client") {
      errors.push("Solo se puede asignar pods a usuarios con rol 'client'");
    }
  }

  return errors;
}

// Función para asignar nombres a servicios con template
function assignServiceNames(userPorts, templatePorts, enableJupyter) {
  const result = [];
  
  userPorts.forEach((port, index) => {
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

// Función para asignar nombres a servicios con imagen docker
function assignServiceNamesDocker(userPorts, enableJupyter) {
  const result = [];
  
  userPorts.forEach((port, index) => {
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

// Función para calcular costo del pod
function calculatePodCost(podConfig) {
  // Implementar lógica de cálculo según configuración
  // Este es un ejemplo simplificado
  const gpuCosts = {
    'rtx-4050': 0.5,
    'rtx-4070': 1.0,
    'rtx-4090': 2.5
  };
  
  const baseCost = gpuCosts[podConfig.gpu] || 0.3;
  const storageCost = (podConfig.containerDiskSize + podConfig.volumeDiskSize) * 0.01;
  
  return baseCost + storageCost;
}
```
### Endpoint para Conexiones de Pod
```javascript
/**
 * Obtiene información de conexión para un pod
 */
exports.getPodConnections = async (req, res) => {
  try {
    const podId = req.params.id;
    const pod = await Pod.findOne({ podId });
    
    if (!pod) {
      return res.status(404).json({
        success: false,
        message: 'Pod no encontrado'
      });
    }
    
    // Verificar acceso
    if (req.user.role !== 'admin' && pod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a este pod'
      });
    }
    
    // Si el pod está detenido, devolver estado especial
    if (pod.status === 'stopped') {
      return res.status(200).json({
        success: true,
        data: {
          podId: pod.podId,
          podName: pod.podName,
          status: 'stopped',
          message: 'El pod está detenido',
          httpServices: [],
          tcpServices: []
        }
      });
    }
    
    // Si el pod está en creación, actualizar sus httpServices
    if (pod.status === 'creating') {
      return res.status(200).json({
        success: true,
        data: {
          podId: pod.podId,
          podName: pod.podName,
          status: 'starting',
          httpServices: pod.httpServices.map(service => ({
            port: service.port,
            serviceName: service.serviceName,
            url: service.url,
            isCustom: service.isCustom,
            status: 'starting'
          })),
          tcpServices: []
        }
      });
    }
    
    // Pod en funcionamiento normal
    return res.status(200).json({
      success: true,
      data: {
        podId: pod.podId,
        podName: pod.podName,
        status: pod.status,
        httpServices: pod.httpServices.map(service => ({
          port: service.port,
          serviceName: service.serviceName,
          url: service.jupyterToken && service.port === 8888 ? 
            `${service.url}?token=${service.jupyterToken}` : service.url,
          isCustom: service.isCustom,
          status: service.status
        })),
        tcpServices: pod.tcpServices
      }
    });
    
  } catch (error) {
    console.error('Error al obtener conexiones de pod:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener conexiones',
      error: error.message
    });
  }
};

/**
 * Inicia un pod detenido
 */
exports.startPod = async (req, res) => {
  try {
    const podId = req.params.id;
    const pod = await Pod.findOne({ podId });
    
    if (!pod) {
      return res.status(404).json({
        success: false,
        message: 'Pod no encontrado'
      });
    }
    
    // Verificar acceso
    if (req.user.role !== 'admin' && pod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a este pod'
      });
    }
    
    if (pod.status === 'running') {
      return res.status(400).json({
        success: false,
        message: 'El pod ya está en ejecución'
      });
    }
    
    // Iniciar el pod en Kubernetes
    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    
    // Recrear el pod y sus servicios
    await createPodWithServices({
      name: pod.podName,
      userId: pod.userId.toString(),
      dockerImage: pod.dockerImage,
      ports: pod.httpServices.map(s => s.port).join(','),
      containerDiskSize: pod.containerDiskSize,
      volumeDiskSize: pod.volumeDiskSize,
      gpu: pod.gpu,
      enableJupyter: pod.enableJupyter
    });
    
    // Actualizar estado en la base de datos
    pod.status = 'creating';
    pod.httpServices.forEach(service => {
      service.status = 'creating';
    });
    await pod.save();
    
    // Capturar token de Jupyter si es necesario
    if (pod.enableJupyter && pod.httpServices.some(s => s.port === 8888)) {
      setTimeout(() => {
        captureJupyterToken(pod.podName, pod.userHash)
          .catch(err => console.error('Error capturando token Jupyter:', err));
      }, 10000);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Pod iniciándose',
      data: {
        podId: pod.podId,
        status: 'creating'
      }
    });
    
  } catch (error) {
    console.error('Error al iniciar pod:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al iniciar el pod',
      error: error.message
    });
  }
};

/**
 * Detiene un pod en ejecución
 */
exports.stopPod = async (req, res) => {
  try {
    const podId = req.params.id;
    const pod = await Pod.findOne({ podId });
    
    if (!pod) {
      return res.status(404).json({
        success: false,
        message: 'Pod no encontrado'
      });
    }
    
    // Verificar acceso
    if (req.user.role !== 'admin' && pod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a este pod'
      });
    }
    
    if (pod.status === 'stopped') {
      return res.status(400).json({
        success: false,
        message: 'El pod ya está detenido'
      });
    }
    
    // Detener el pod en Kubernetes
    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    const k8sNetworkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
    
    // Eliminar pod
    try {
      await k8sApi.deleteNamespacedPod(
        `${pod.podName}-${pod.userHash}`, 
        'default'
      );
    } catch (err) {
      console.warn(`Pod ${pod.podName}-${pod.userHash} no encontrado en K8s o ya eliminado`);
    }
    
    // Eliminar services e ingress
    for (const service of pod.httpServices) {
      try {
        await k8sApi.deleteNamespacedService(
          service.kubernetesServiceName,
          'default'
        );
      } catch (err) {
        console.warn(`Service ${service.kubernetesServiceName} no encontrado o ya eliminado`);
      }
      
      try {
        await k8sNetworkingApi.deleteNamespacedIngress(
          service.kubernetesIngressName,
          'default'
        );
      } catch (err) {
        console.warn(`Ingress ${service.kubernetesIngressName} no encontrado o ya eliminado`);
      }
    }
    
    // Actualizar estado en la base de datos
    pod.status = 'stopped';
    pod.httpServices.forEach(service => {
      service.status = 'stopped';
    });
    await pod.save();
    
    return res.status(200).json({
      success: true,
      message: 'Pod detenido correctamente',
      data: {
        podId: pod.podId,
        status: 'stopped'
      }
    });
    
  } catch (error) {
    console.error('Error al detener pod:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al detener el pod',
      error: error.message
    });
  }
};

/**
 * Elimina un pod
 */
exports.deletePod = async (req, res) => {
  try {
    const podId = req.params.id;
    const pod = await Pod.findOne({ podId });
    
    if (!pod) {
      return res.status(404).json({
        success: false,
        message: 'Pod no encontrado'
      });
    }
    
    // Verificar acceso
    if (req.user.role !== 'admin' && pod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este pod'
      });
    }
    
    // Detener el pod primero si está en ejecución
    if (pod.status === 'running' || pod.status === 'creating') {
      const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
      const k8sNetworkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
      
      // Eliminar pod
      try {
        await k8sApi.deleteNamespacedPod(
          `${pod.podName}-${pod.userHash}`, 
          'default'
        );
      } catch (err) {
        console.warn(`Pod ${pod.podName}-${pod.userHash} no encontrado en K8s o ya eliminado`);
      }
      
      // Eliminar services e ingress
      for (const service of pod.httpServices) {
        try {
          await k8sApi.deleteNamespacedService(
            service.kubernetesServiceName,
            'default'
          );
        } catch (err) {
          console.warn(`Service ${service.kubernetesServiceName} no encontrado o ya eliminado`);
        }
        
        try {
          await k8sNetworkingApi.deleteNamespacedIngress(
            service.kubernetesIngressName,
            'default'
          );
        } catch (err) {
          console.warn(`Ingress ${service.kubernetesIngressName} no encontrado o ya eliminado`);
        }
      }
    }
    
    // Eliminar el pod de la base de datos
    await Pod.findByIdAndDelete(pod._id);
    
    return res.status(200).json({
      success: true,
      message: 'Pod eliminado correctamente'
    });
    
  } catch (error) {
    console.error('Error al eliminar pod:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al eliminar el pod',
      error: error.message
    });
  }
};

/**
 * Obtiene los logs de un pod
 */
exports.getPodLogs = async (req, res) => {
  try {
    const podId = req.params.id;
    const pod = await Pod.findOne({ podId });
    
    if (!pod) {
      return res.status(404).json({
        success: false,
        message: 'Pod no encontrado'
      });
    }
    
    // Verificar acceso
    if (req.user.role !== 'admin' && pod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a los logs de este pod'
      });
    }
    
    // Si el pod está detenido
    if (pod.status === 'stopped') {
      return res.status(200).json({
        success: true,
        data: {
          logs: 'El pod está detenido. No hay logs disponibles.'
        }
      });
    }
    
    // Obtener logs del pod
    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    
    try {
      const { body } = await k8sApi.readNamespacedPodLog(
        `${pod.podName}-${pod.userHash}`, 
        'default',
        'main',  // Nombre del contenedor
        undefined,
        false,
        undefined,
        undefined,
        undefined,
        500  // Obtener últimas 500 líneas
      );
      
      return res.status(200).json({
        success: true,
        data: {
          logs: body
        }
      });
    } catch (error) {
      return res.status(200).json({
        success: true,
        data: {
          logs: 'No se pudieron obtener los logs. El pod podría estar iniciándose.'
        }
      });
    }
    
  } catch (error) {
    console.error('Error al obtener logs del pod:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener logs',
      error: error.message
    });
  }
};
```

## Conectando el Frontend
### Implementación del Modal de Conexión
Vamos a implementar el modal de conexión basado en la especificación de MODAL_FRONTEND.md:

> **Nota**: El ejemplo actual esta en formato jxs, adaptarlo a tsx que es como esta hecho el frontend.

```jsx
// src/components/client/pods/PodConnectDialog.tsx
// src/components/admin/pods/PodConnectDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Wifi, WifiOff, Loader2 } from 'lucide-react';
import axios from 'axios';

const ConnectionModal = ({ podId, isOpen, onClose }) => {
  const [connections, setConnections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && podId) {
      fetchConnections();
    }
  }, [isOpen, podId]);

  const fetchConnections = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/pods/${podId}/connections`);
      setConnections(response.data.data);
    } catch (error) {
      console.error('Error fetching connections:', error);
      setError('No se pudieron cargar las conexiones. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const openService = (url, isAvailable) => {
    if (isAvailable) {
      window.open(url, '_blank');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready': return '🟢';
      case 'starting': return '🟡';
      case 'error': return '🔴';
      case 'stopped': return '🔴';
      default: return '⚪';
    }
  };

  const isServiceAvailable = (status) => status === 'ready';

  const renderServiceCard = (service, index, isTcp = false) => (
    <div 
      key={index} 
      className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
        isTcp ? 'bg-gray-50 opacity-60' : 'bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{service.serviceName}</span>
          <span className="text-lg">{getStatusIcon(service.status)}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          → :{service.port}
        </div>
      </div>
      <Button
        size="sm"
        variant={isTcp ? "outline" : "default"}
        onClick={() => openService(service.url, isServiceAvailable(service.status))}
        disabled={isTcp || !isServiceAvailable(service.status)}
        className="ml-3"
      >
        <ExternalLink className="w-4 h-4 mr-1" />
        {isTcp ? 'TCP' : 'Abrir'}
      </Button>
    </div>
  );
  
  // Si hay error
  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Error de conexión
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center py-6">
            <p className="text-red-500">{error}</p>
            <Button 
              onClick={fetchConnections} 
              className="mt-4"
            >
              Reintentar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Conectar a: {connections?.podName || 'Pod'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : connections?.status === 'stopped' ? (
            <div className="text-center py-6 space-y-3">
              <WifiOff className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium">🛑 El pod está detenido</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Para acceder a los servicios, inicia el pod desde el botón "Iniciar" en la tabla de pods.
                </p>
              </div>
            </div>
          ) : connections?.status === 'starting' || connections?.status === 'creating' ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-yellow-500" />
                <p className="text-sm text-muted-foreground mt-2">
                  ⏳ El pod se está iniciando...
                </p>
              </div>
              
              {/* HTTP Services */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  📡 HTTP Services:
                </h4>
                <div className="space-y-2">
                  {connections?.httpServices?.map((service, index) =>
                    renderServiceCard({...service, status: 'starting'}, index, false)
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* HTTP Services */}
              {connections?.httpServices?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    📡 HTTP Services:
                  </h4>
                  <div className="space-y-2">
                    {connections.httpServices.map((service, index) =>
                      renderServiceCard(service, index, false)
                    )}
                  </div>
                </div>
              )}

              {/* TCP Services */}
              {connections?.tcpServices?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    🔌 TCP Services:
                  </h4>
                  <div className="space-y-2">
                    {connections.tcpServices.map((service, index) =>
                      renderServiceCard(service, index, true)
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionModal;
```

### Implementación de las tablas de Pods

Para las páginas de Pods (admin/Pods.tsx y client/Pods.tsx), implementemos el componente de tabla con acciones:

> **Nota**: El ejemplo actual esta en formato jxs, adaptarlo a tsx que es como esta hecho el frontend.

```jsx
// src/components/admin/pods/*.tsx        # te lo dejo a juicio propio
// src/components/client/pods/*.tsx       # te lo dejo a juicio propio
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Play, Square, Trash2, Terminal, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import axios from 'axios';
import ConnectionModal from '@/components/modals/ConnectionModal';
import LogsModal from '@/components/modals/LogsModal';
import { toast } from 'react-hot-toast';

const PodsTable = ({ pods, onPodsChange, isAdmin = false }) => {
  const [loadingStates, setLoadingStates] = useState({});
  const [selectedPodId, setSelectedPodId] = useState(null);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  
  const handleAction = async (podId, action) => {
    setLoadingStates(prev => ({ ...prev, [podId]: action }));
    
    try {
      let response;
      
      switch (action) {
        case 'start':
          response = await axios.post(`/api/pods/${podId}/start`);
          toast.success('Pod iniciando, esto puede tardar unos minutos');
          break;
        case 'stop':
          response = await axios.post(`/api/pods/${podId}/stop`);
          toast.success('Pod detenido correctamente');
          break;
        case 'delete':
          if (window.confirm('¿Estás seguro de que deseas eliminar este pod? Esta acción no puede deshacerse.')) {
            response = await axios.delete(`/api/pods/${podId}`);
            toast.success('Pod eliminado correctamente');
          } else {
            setLoadingStates(prev => ({ ...prev, [podId]: null }));
            return;
          }
          break;
        default:
          break;
      }
      
      // Actualizar lista de pods
      onPodsChange();
      
    } catch (error) {
      console.error(`Error al ${action} pod:`, error);
      toast.error(`Error al ${action === 'start' ? 'iniciar' : action === 'stop' ? 'detener' : 'eliminar'} el pod`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [podId]: null }));
    }
  };
  
  const formatUptime = (startTime) => {
    if (!startTime) return '-';
    return formatDistanceToNow(new Date(startTime), { locale: es, addSuffix: false });
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'running':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Ejecutando</span>;
      case 'stopped':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Detenido</span>;
      case 'creating':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Iniciando</span>;
      case 'error':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Error</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Desconocido</span>;
    }
  };
  
  const openConnectionModal = (podId) => {
    setSelectedPodId(podId);
    setIsConnectionModalOpen(true);
  };
  
  const openLogsModal = (podId) => {
    setSelectedPodId(podId);
    setIsLogsModalOpen(true);
  };
  
  if (!pods?.length) {
    return (
      <div className="text-center py-10 border rounded-lg">
        <p className="text-muted-foreground">No hay pods disponibles.</p>
        <p className="text-sm text-muted-foreground mt-1">Crea un nuevo pod desde la página "Desplegar Pod".</p>
      </div>
    );
  }
  
  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>GPU</TableHead>
              <TableHead>Tiempo Activo</TableHead>
              <TableHead>CPU</TableHead>
              <TableHead>Memoria</TableHead>
              <TableHead>GPU</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pods.map((pod) => (
              <TableRow key={pod.podId}>
                <TableCell className="font-medium">{pod.podName}</TableCell>
                <TableCell>{getStatusBadge(pod.status)}</TableCell>
                <TableCell>{pod.gpu}</TableCell>
                <TableCell>
                  {pod.status === 'running' ? formatUptime(pod.lastActive) : '-'}
                </TableCell>
                <TableCell>
                  {pod.status === 'running' ? `${pod.stats.cpuUsage.toFixed(1)}%` : 'No disponible'}
                </TableCell>
                <TableCell>
                  {pod.status === 'running' ? `${pod.stats.memoryUsage.toFixed(1)}%` : 'No disponible'}
                </TableCell>
                <TableCell>
                  {pod.status === 'running' ? `${pod.stats.gpuUsage.toFixed(1)}%` : 'No disponible'}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    {pod.status === 'stopped' ? (
                      <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={() => handleAction(pod.podId, 'start')}
                        disabled={loadingStates[pod.podId]}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={() => handleAction(pod.podId, 'stop')}
                        disabled={loadingStates[pod.podId] || pod.status === 'creating'}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => openConnectionModal(pod.podId)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => openLogsModal(pod.podId)}
                    >
                      <Terminal className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleAction(pod.podId, 'delete')}
                      disabled={loadingStates[pod.podId]}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <ConnectionModal 
        podId={selectedPodId}
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
      />
      
      <LogsModal 
        podId={selectedPodId}
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
      />
    </>
  );
};

export default PodsTable;
```

### Modal de Logs para visualizar los logs del pod

> **Nota**: El ejemplo actual esta en formato jxs, adaptarlo a tsx que es como esta hecho el frontend.

```jsx
// src/components/admin/pods/PodConnectDialog.tsx
// src/components/client/pods/PodConnectDialog.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Terminal, Download, RefreshCw, Loader2 } from 'lucide-react';
import axios from 'axios';

const LogsModal = ({ podId, isOpen, onClose }) => {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const logsRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && podId) {
      fetchLogs();
    }
  }, [isOpen, podId]);
  
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/pods/${podId}/logs`);
      setLogs(response.data.data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError('No se pudieron cargar los logs. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const downloadLogs = () => {
    const element = document.createElement('a');
    const file = new Blob([logs], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `pod-logs-${podId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Logs del Pod
          </DialogTitle>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchLogs}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Actualizar
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadLogs}
              disabled={loading || !logs}
            >
              <Download className="h-4 w-4 mr-1" />
              Descargar
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-red-500">{error}</p>
            </div>
          ) : (
            <div 
              ref={logsRef} 
              className="flex-1 overflow-auto bg-black text-gray-200 p-4 font-mono text-sm rounded-md"
            >
              {logs ? (
                <pre className="whitespace-pre-wrap">{logs}</pre>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No hay logs disponibles
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LogsModal;
```

### Implementación de las páginas de Pods

#### AdminPods.tsx

> **Nota**: El ejemplo actual esta en formato jxs, adaptarlo a tsx que es como esta hecho el frontend.

```jsx
// src/pages/admin/Pods.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PodsTable from '@/components/pods/PodsTable';
import axios from 'axios';
import { Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminPods = () => {
  const navigate = useNavigate();
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  
  useEffect(() => {
    fetchPods();
  }, []);
  
  const fetchPods = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/pods/admin');
      setPods(response.data.data);
    } catch (error) {
      console.error('Error fetching pods:', error);
      setError('No se pudieron cargar los pods. Inténtalo de nuevo.');
      toast.error('Error al cargar los pods');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearchByEmail = async () => {
    if (!searchEmail.trim()) {
      toast.error('Por favor, ingresa un correo electrónico');
      return;
    }
    
    setSearching(true);
    
    try {
      const response = await axios.get(`/api/pods/admin?userEmail=${searchEmail.trim()}`);
      setPods(response.data.data);
      
      if (response.data.data.length === 0) {
        toast.info('No se encontraron pods para este usuario');
      }
    } catch (error) {
      console.error('Error searching pods by email:', error);
      toast.error('Error al buscar pods por correo');
    } finally {
      setSearching(false);
    }
  };
  
  const handleClearSearch = () => {
    setSearchEmail('');
    fetchPods();
  };
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Pods</h1>
        <Button onClick={() => navigate('/admin/pods/deploy')}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Pod
        </Button>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Buscar Pods por Usuario</h2>
          <div className="flex space-x-2">
            <div className="flex-1">
              <Label htmlFor="searchEmail">Correo Electrónico</Label>
              <Input
                id="searchEmail"
                type="email"
                placeholder="cliente@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>
            <div className="flex items-end space-x-2">
              <Button 
                onClick={handleSearchByEmail}
                disabled={searching || !searchEmail.trim()}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Search className="h-4 w-4 mr-1" />
                )}
                Buscar
              </Button>
              
              {searchEmail && (
                <Button 
                  variant="outline" 
                  onClick={handleClearSearch}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">
            {searchEmail ? `Pods de ${searchEmail}` : 'Mis Pods'}
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              <p>{error}</p>
              <Button 
                variant="outline" 
                onClick={fetchPods} 
                className="mt-4"
              >
                Reintentar
              </Button>
            </div>
          ) : (
            <PodsTable 
              pods={pods} 
              onPodsChange={fetchPods} 
              isAdmin={true} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPods;
```

#### ClientPods.tsx

> **Nota**: El ejemplo actual esta en formato jxs, adaptarlo a tsx que es como esta hecho el frontend.

```jsx
// src/pages/client/Pods.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PodsTable from '@/components/pods/PodsTable';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ClientPods = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchPods();
  }, []);
  
  const fetchPods = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/pods');
      setPods(response.data.data);
    } catch (error) {
      console.error('Error fetching pods:', error);
      setError('No se pudieron cargar los pods. Inténtalo de nuevo.');
      toast.error('Error al cargar los pods');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mis Pods</h1>
        <Button onClick={() => navigate('/client/pods/deploy')}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Pod
        </Button>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Pods Activos</h2>
          <div className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
            Saldo: €{user?.balance?.toFixed(2) || '0.00'}
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">
            <p>{error}</p>
            <Button 
              variant="outline" 
              onClick={fetchPods} 
              className="mt-4"
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <PodsTable 
            pods={pods} 
            onPodsChange={fetchPods} 
            isAdmin={false} 
          />
        )}
      </div>
    </div>
  );
};

export default ClientPods;
```

#### Conexión con el Backend

Configuración para hacer todas las peticiones al backend desde el frontend:

```jsx
// src/lib/axios.js
import axios from 'axios';

const baseURL = 'http://localhost:3000'; // En producción: 'https://api.neuropod.online'

const apiClient = axios.create({
  baseURL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el token de autenticación a todas las peticiones
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación (token expirado, etc.)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Redirigir al login si el token expiró
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

## Monitoreo de Pods y WebSockets

### Servicio de Monitoreo de Pods en el Backend

```javascript
// services/podMonitor.js
const k8s = require('@kubernetes/client-node');
const Pod = require('../models/Pod');
const WebSocket = require('ws');

// Configurar cliente de Kubernetes
const kc = new k8s.KubeConfig();
kc.loadFromDefault(); // Para cluster externo
// kc.loadFromCluster(); // Para ejecutarse dentro del cluster

let wss; // WebSocket server

/**
 * Inicializa el servicio de monitoreo de pods
 */
function initPodMonitor(server) {
  console.log('Iniciando servicio de monitoreo de pods...');
  
  // Configurar WebSocket server
  wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws) => {
    ws.isAlive = true;
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Suscripción a actualizaciones de pod
        if (data.type === 'subscribe' && data.podId) {
          ws.podId = data.podId;
          ws.userId = data.userId;
        }
      } catch (e) {
        console.error('Error procesando mensaje WebSocket:', e);
      }
    });
  });
  
  // Ping para mantener conexiones activas
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  // Iniciar monitoreo periódico de pods
  startPeriodicMonitoring();
}

/**
 * Inicia el monitoreo periódico de pods
 */
function startPeriodicMonitoring() {
  console.log('Iniciando monitoreo periódico de pods...');
  
  // Verificar estado de pods cada 30 segundos
  setInterval(async () => {
    try {
      // Obtener todos los pods que no están detenidos
      const activePods = await Pod.find({ 
        status: { $in: ['running', 'creating'] } 
      });
      
      if (activePods.length === 0) return;
      
      console.log(`Monitoreando ${activePods.length} pods activos...`);
      
      // Verificar el estado de cada pod
      for (const pod of activePods) {
        await updatePodStatus(pod);
      }
    } catch (error) {
      console.error('Error en monitoreo periódico:', error);
    }
  }, 30000);
}

/**
 * Actualiza el estado de un pod
 */
async function updatePodStatus(pod) {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  const k8sPodName = `${pod.podName}-${pod.userHash}`;
  
  try {
    // Intentar obtener el pod de Kubernetes
    const { body: k8sPod } = await k8sApi.readNamespacedPod(
      k8sPodName,
      'default'
    );
    
    // Obtener métricas del pod
    const stats = await getPodMetrics(k8sPod);
    
    // Actualizar estado del pod en la base de datos
    const newStatus = k8sPod.status.phase === 'Running' ? 'running' : 'creating';
    
    if (newStatus !== pod.status || stats) {
      // Actualizar estado del pod
      pod.status = newStatus;
      
      // Actualizar estado de los servicios HTTP
      pod.httpServices.forEach(service => {
        service.status = newStatus === 'running' ? 'ready' : 'creating';
      });
      
      // Actualizar estadísticas
      if (stats) {
        pod.stats = {
          ...pod.stats,
          ...stats,
          lastUpdated: new Date()
        };
      }
      
      // Si el pod estaba en 'creating' y ahora está 'running', capturar token de Jupyter
      if (pod.status === 'running' && pod.enableJupyter) {
        const jupyterService = pod.httpServices.find(s => s.port === 8888);
        if (jupyterService && !jupyterService.jupyterToken) {
          const token = await captureJupyterToken(pod.podName, pod.userHash);
          if (token) {
            jupyterService.jupyterToken = token;
          }
        }
      }
      
      await pod.save();
      
      // Notificar a los clientes suscritos por WebSocket
      notifyPodUpdate(pod);
    }
  } catch (error) {
    // Si el pod no existe en Kubernetes pero está en la BD como 'running'
    if (error.statusCode === 404 && pod.status !== 'stopped') {
      console.log(`Pod ${k8sPodName} no encontrado en K8s, marcando como detenido`);
      
      // Marcar como detenido
      pod.status = 'stopped';
      pod.httpServices.forEach(service => {
        service.status = 'stopped';
      });
      
      await pod.save();
      
      // Notificar a los clientes suscritos
      notifyPodUpdate(pod);
    } else if (error.statusCode !== 404) {
      console.error(`Error al verificar pod ${k8sPodName}:`, error);
    }
  }
}

/**
 * Obtiene métricas de un pod
 */
async function getPodMetrics(k8sPod) {
  try {
    // Esta es una implementación simple. Para métricas reales, usar metrics-server
    // o una solución como Prometheus + custom-metrics-apiserver
    
    // Por ahora, generamos valores aleatorios simulados
    const cpuUsage = Math.random() * 30; // 0-30%
    const memoryUsage = Math.random() * 50; // 0-50%
    const gpuUsage = Math.random() * 40; // 0-40%
    
    // Calcular uptime
    const startTime = new Date(k8sPod.status.startTime);
    const uptime = Math.floor((new Date() - startTime) / 1000); // en segundos
    
    return {
      cpuUsage,
      memoryUsage,
      gpuUsage,
      uptime
    };
    
    // NOTA: Para una implementación real, usar metrics-server:
    // const metricsApi = kc.makeApiClient(k8s.CustomObjectsApi);
    // const metrics = await metricsApi.getNamespacedCustomObject(
    //   'metrics.k8s.io',
    //   'v1beta1',
    //   'default',
    //   'pods',
    //   k8sPod.metadata.name
    // );
  } catch (error) {
    console.error('Error al obtener métricas:', error);
    return null;
  }
}

/**
 * Notifica a los clientes suscritos por WebSocket
 */
function notifyPodUpdate(pod) {
  if (!wss) return;
  
  const podUpdate = {
    type: 'podUpdate',
    podId: pod.podId,
    status: pod.status,
    stats: pod.stats
  };
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.podId === pod.podId) {
      client.send(JSON.stringify(podUpdate));
    }
  });
}

/**
 * Captura el token de Jupyter de un pod
 */
async function captureJupyterToken(podName, userHash) {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  const podFullName = `${podName}-${userHash}`;
  
  try {
    // Obtener logs del contenedor
    const { body: logs } = await k8sApi.readNamespacedPodLog(
      podFullName,
      'default',
      'main',
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      500
    );
    
    // Buscar token de Jupyter
    const jupyterTokenMatch = logs.match(/token=([a-f0-9]+)/);
    if (jupyterTokenMatch && jupyterTokenMatch[1]) {
      return jupyterTokenMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error(`Error al capturar token de Jupyter para ${podFullName}:`, error);
    return null;
  }
}

module.exports = {
  initPodMonitor,
  updatePodStatus,
  captureJupyterToken
};
```

### Integración de WebSockets en el Frontend

> **Nota**: El ejemplo actual esta en formato jxs, adaptarlo a tsx que es como esta hecho el frontend.

```jsx
// crear src/lib/websocket.js
class PodSocket {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.subscribers = new Map();
    this.reconnectTimeout = null;
    this.isConnecting = false;
  }
  
  connect() {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }
    
    this.isConnecting = true;
    
    // Usar URL relativa en desarrollo, absoluta en producción
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://api.neuropod.online/ws' 
      : `ws://${window.location.hostname}:3000/ws`;
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      // Reenviar suscripciones
      this.subscribers.forEach((callback, podId) => {
        this.subscribeToPod(podId);
      });
    };
    
    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.socket = null;
      this.isConnecting = false;
      
      // Intentar reconectar con backoff exponencial
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const timeout = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        this.reconnectAttempts++;
        
        console.log(`Reconnecting in ${timeout}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, timeout);
      }
    };
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'podUpdate' && data.podId) {
          // Notificar a los suscriptores
          const callback = this.subscribers.get(data.podId);
          if (callback) {
            callback(data);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
  
  subscribeToPod(podId, userId) {
    if (!podId) return;
    
    // Conectar si no está conectado
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect();
    }
    
    // Enviar mensaje de suscripción
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'subscribe',
        podId,
        userId
      }));
    }
  }
  
  unsubscribeFromPod(podId) {
    this.subscribers.delete(podId);
    
    // Si no hay más suscriptores, desconectar
    if (this.subscribers.size === 0) {
      this.disconnect();
    }
  }
  
  onPodUpdate(podId, callback) {
    if (!podId || typeof callback !== 'function') return;
    
    // Guardar callback para este pod
    this.subscribers.set(podId, callback);
    
    // Iniciar suscripción
    const userId = JSON.parse(localStorage.getItem('user'))?._id;
    this.subscribeToPod(podId, userId);
    
    // Devolver función para cancelar suscripción
    return () => {
      this.unsubscribeFromPod(podId);
    };
  }
}

export default new PodSocket();
```

### Uso de WebSockets en componentes

> **Nota**: El ejemplo actual esta en formato jxs, adaptarlo a tsx que es como esta hecho el frontend.

```jsx
// en src/components/admin/pods/*.tsx        # te lo dejo a juicio propio
// en src/components/client/pods/*.tsx       # te lo dejo a juicio propio
import podSocket from '@/lib/websocket';

// Dentro del componente
useEffect(() => {
  // Suscribirse a actualizaciones para cada pod
  const unsubscribes = pods.map(pod => 
    podSocket.onPodUpdate(pod.podId, (update) => {
      // Actualizar estado local del pod
      setPods(currentPods => 
        currentPods.map(p => 
          p.podId === update.podId 
            ? { ...p, status: update.status, stats: update.stats } 
            : p
        )
      );
    })
  );
  
  // Limpiar al desmontar
  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
}, [pods]);
```

## Configuración de la Cloudflare Tunnel

Para que todo funcione correctamente con Cloudflare Tunnel:

```yaml
# ~/.cloudflared/config.yml (Windows: %USERPROFILE%\.cloudflared\config.yml)
tunnel: neuropod-tunnel
credentials-file: C:\Users\<tu-usuario>\.cloudflared\neuropod-tunnel.json

ingress:
  # Frontend React
  - hostname: app.neuropod.online
    service: http://localhost:5173
  
  # Backend API
  - hostname: api.neuropod.online
    service: http://localhost:3000
  
  # Wildcard para los pods de usuario - CONFIGURACIÓN MEJORADA
  - hostname: "*.neuropod.online"
    service: http://localhost:443
    originRequest:
      noTLSVerify: true
      # Configuración importante para WebSockets (Jupyter Lab)
      connectTimeout: 30s
      tlsTimeout: 30s
      tcpKeepAlive: 30s
      disableChunkedEncoding: true # Ayuda con ciertos problemas WebSocket
      # Configuración para tokens de acceso y Jupyter Lab
      http2Origin: false

  # Fallback
  - service: http_status:404
```

## Resumen y Recomendaciones Finales

### Estructura Correcta para Pods y Servicios

Para resolver los problemas de token en Jupyter Lab y otros servicios:

1. Un Pod principal: Contiene todos los puertos expuestos
2. Un Service por puerto: Cada puerto del pod tiene su propio servicio
3. Un Ingress por puerto: Cada servicio tiene su propia regla de Ingress con subdominio único
4. Puertos reales mantenidos: No usar port 80 en los servicios, sino mantener los puertos originales

### Manejo de Servicios como Jupyter Lab

1. Captura de token: Implementar una función que lea los logs del pod para capturar el token de Jupyter
2. URL con token incluido: Almacenar el token en la base de datos y construir URLs con el token incluido
3. WebSockets: Configurar adecuadamente NGINX y Cloudflare para soportar WebSockets

### Próximos Pasos Recomendados

1. Completa la implementación del backend: Asegúrate de implementar todos los endpoints necesarios
2. Termina la configuración de Kubernetes: Aplica los ConfigMaps y otras configuraciones
3. Prueba un despliegue completo: Desde la creación hasta la conexión a un pod con Jupyter

### Consideraciones de Seguridad

1. HTTPS: Todo el tráfico debe estar protegido por HTTPS (Cloudflare lo proporciona)

    **Certificados TLS dentro del clúster**:
    Aunque Cloudflare maneja HTTPS externamente, es recomendable tener TLS dentro del clúster:
    ```powershell
    # Instalar OpenSSL si no lo tienes (puedes usar Chocolatey)
    # choco install openssl

    # Crear un certificado autofirmado para comunicación interna
    # Ejecutar en PowerShell:
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
    -keyout tls.key -out tls.crt -subj "/CN=*.neuropod.local"
   
    # Crear un secret de Kubernetes con el certificado
    kubectl create secret tls neuropod-tls --key tls.key --cert tls.crt
    ```

2. Aislamiento de pods: Usa NetworkPolicies para aislar los pods entre sí
3. Restricción de recursos: Limita la CPU, memoria y GPU que puede usar cada pod
4. Volúmenes isolados: Asegúrate de que cada usuario solo pueda acceder a su propio PVC

Con esta implementación completa, Neuropod debería funcionar correctamente en tu entorno Windows, permitiendo a los usuarios crear y gestionar contenedores Docker con acceso a servicios web como Jupyter Lab.