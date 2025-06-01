# Plan de Implementación para Neuropod en Windows

## Arquitectura y Configuración Base

### 1. Arquitectura de Red del proyecto

La arquitectura de red está diseñada de la siguiente manera:

```
                               🌐 Internet
                                      |
            +-------------------------+------------------------+
            |                         |                        |
            v                         v                        v
  app.neuropod.online       api.neuropod.online   Wildcard (*.neuropod.online)
      (Frontend)               (Backend API)           (Pods de Usuario)
            |                         |                        |
            v                         v                        v
+-----------------------+--- Cloudflare Tunnel ---+-------------------------+
|    localhost:5173     |     localhost:3000      |      localhost:443      |
```

### 2. Configuracion Base del proyecto

*Revisa la configuracion base en los manifiestos de **GUIA_MINIKUBE_CONFIGURACION_HECHO.md***

## Solución para el Manejo de Subdominios y Servicios

### 1. Problema con la Arquitectura Actual

**El principal problema identificado es:**

### 2. Solución Mejorada para Ingress y Services

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

### 3. Función JavaScript Mejorada para Crear Resources

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

### 4. Captura del Token de Jupyter Lab

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

### 2. Controlador para Crear Pods

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
  
  if (payload.containerDiskSize < 1 || payload.containerDiskSize > 100) {
    errors.push("Tamaño de disco de contenedor debe estar entre 1 y 100 GB");
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

## Resumen y Recomendaciones Finales

### 1. Estructura Correcta para Pods y Servicios

Para resolver los problemas de token en Jupyter Lab y otros servicios:

1. Un Pod principal: Contiene todos los puertos expuestos
2. Un Service por puerto: Cada puerto del pod tiene su propio servicio
3. Un Ingress por puerto: Cada servicio tiene su propia regla de Ingress con subdominio único
4. Puertos reales mantenidos: No usar port 80 en los servicios, sino mantener los puertos originales

### 2. Manejo de Servicios como Jupyter Lab

1. Captura de token: Implementar una función que lea los logs del pod para capturar el token de Jupyter
2. URL con token incluido: Almacenar el token en la base de datos y construir URLs con el token incluido
3. WebSockets: Configurar adecuadamente NGINX y Cloudflare para soportar WebSockets

### 3. Próximos Pasos Recomendados

1. Prueba un despliegue completo: Desde la creación hasta la conexión a un pod con Jupyter

### 4. Consideraciones de Seguridad

1. Aislamiento de pods: Usa NetworkPolicies para aislar los pods entre sí
2. Restricción de recursos: Limita la CPU, memoria y GPU que puede usar cada pod
3. Volúmenes persistentes: Asegúrate de que cada usuario y pod solo pueda acceder a su propio PVC