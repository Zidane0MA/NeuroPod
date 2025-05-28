// Servicio para manejar operaciones de Kubernetes
// Este servicio maneja la creación, gestión y eliminación de recursos de Kubernetes

const k8s = require('@kubernetes/client-node');
const crypto = require('crypto');
const { generateUserHash, generateSecureSubdomain } = require('../utils/podHelpers');

class KubernetesService {
  constructor() {
    // Configurar cliente de Kubernetes
    this.kc = new k8s.KubeConfig();
    
    try {
      // Intentar cargar configuración de Kubernetes
      if (process.env.NODE_ENV === 'production') {
        this.kc.loadFromCluster(); // Para pods ejecutándose dentro del cluster
      } else {
        this.kc.loadFromDefault(); // Para desarrollo local con minikube
      }
      
      this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
      this.k8sNetworkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
      
      console.log('✅ Kubernetes client initialized successfully');
    } catch (error) {
      console.warn('⚠️  Kubernetes not available, running in simulation mode:', error.message);
      this.k8sApi = null;
      this.k8sNetworkingApi = null;
    }
  }

  // Verificar si Kubernetes está disponible
  isKubernetesAvailable() {
    return this.k8sApi !== null && this.k8sNetworkingApi !== null;
  }

  // Crear PVC para el usuario si no existe
  async createOrVerifyUserPVC(userId, volumeDiskSize) {
    if (!this.isKubernetesAvailable()) {
      console.log('🔧 [SIMULATION] Creating PVC for user:', userId);
      return `workspace-${generateUserHash(userId)}`;
    }

    const userHash = generateUserHash(userId);
    const pvcName = `workspace-${userHash}`;
    
    try {
      // Verificar si ya existe
      await this.k8sApi.readNamespacedPersistentVolumeClaim(pvcName, 'default');
      console.log(`✅ PVC ${pvcName} already exists`);
      return pvcName;
    } catch (error) {
      if (error.statusCode === 404) {
        // Si no existe, crearlo
        const pvc = {
          apiVersion: 'v1',
          kind: 'PersistentVolumeClaim',
          metadata: {
            name: pvcName,
            labels: {
              app: 'neuropod',
              user: userHash,
              'neuropod.online/resource': 'pvc'
            }
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: `${volumeDiskSize}Gi`
              }
            },
            storageClassName: process.env.STORAGE_CLASS || 'standard'
          }
        };
        
        await this.k8sApi.createNamespacedPersistentVolumeClaim('default', pvc);
        console.log(`✅ PVC ${pvcName} created successfully (${volumeDiskSize}Gi)`);
        return pvcName;
      } else {
        throw error;
      }
    }
  }

  // Crear Service para un puerto específico
  async createServiceForPort(podName, userHash, userId, port) {
    if (!this.isKubernetesAvailable()) {
      console.log(`🔧 [SIMULATION] Creating service for ${podName}-${userHash}-${port}`);
      return `${podName}-${userHash}-${port}-service`;
    }

    const serviceName = `${podName}-${userHash}-${port}-service`;
    
    const service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: serviceName,
        labels: {
          app: podName,
          user: userHash,
          port: `${port}`,
          'neuropod.online/resource': 'service'
        }
      },
      spec: {
        selector: {
          app: podName,
          user: userHash
        },
        ports: [{
          port: port,
          targetPort: port,
          protocol: 'TCP',
          name: `port-${port}`
        }],
        type: 'ClusterIP'
      }
    };
    
    try {
      await this.k8sApi.createNamespacedService('default', service);
      console.log(`✅ Service ${serviceName} created`);
      return serviceName;
    } catch (error) {
      if (error.statusCode === 409) {
        console.log(`⚠️  Service ${serviceName} already exists`);
        return serviceName;
      }
      throw error;
    }
  }

  // Crear Ingress para un puerto específico
  async createIngressForPort(podName, userHash, port, subdomain) {
    if (!this.isKubernetesAvailable()) {
      console.log(`🔧 [SIMULATION] Creating ingress for ${subdomain}`);
      return `${podName}-${userHash}-${port}-ingress`;
    }

    const ingressName = `${podName}-${userHash}-${port}-ingress`;
    const serviceName = `${podName}-${userHash}-${port}-service`;
    
    const ingress = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: ingressName,
        labels: {
          app: podName,
          user: userHash,
          port: `${port}`,
          'neuropod.online/resource': 'ingress'
        },
        annotations: {
          'kubernetes.io/ingress.class': process.env.INGRESS_CLASS || 'nginx',
          'nginx.ingress.kubernetes.io/proxy-read-timeout': '3600',
          'nginx.ingress.kubernetes.io/proxy-send-timeout': '3600',
          'nginx.ingress.kubernetes.io/proxy-http-version': '1.1',
          'nginx.ingress.kubernetes.io/configuration-snippet': `
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
          `,
          'nginx.ingress.kubernetes.io/keep-alive': '75',
          'nginx.ingress.kubernetes.io/keep-alive-requests': '100',
          'nginx.ingress.kubernetes.io/proxy-buffer-size': '16k',
          'nginx.ingress.kubernetes.io/server-name-hash-bucket-size': '256'
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
                  name: serviceName,
                  port: {
                    number: port
                  }
                }
              }
            }]
          }
        }]
      }
    };
    
    try {
      await this.k8sNetworkingApi.createNamespacedIngress('default', ingress);
      console.log(`✅ Ingress ${ingressName} created for ${subdomain}`);
      return ingressName;
    } catch (error) {
      if (error.statusCode === 409) {
        console.log(`⚠️  Ingress ${ingressName} already exists`);
        return ingressName;
      }
      throw error;
    }
  }

  // Crear Pod principal con todos los recursos
  async createPodWithServices(podConfig) {
    const { 
      name: podName, 
      userId, 
      dockerImage, 
      ports, 
      containerDiskSize, 
      volumeDiskSize,
      gpu,
      enableJupyter
    } = podConfig;
    
    const userHash = generateUserHash(userId);
    const portsArray = ports.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
    
    try {
      console.log(`🚀 Creating pod ${podName} for user ${userId}`);
      console.log(`📊 Configuration: ${dockerImage}, ${gpu}, ${containerDiskSize}GB container, ${volumeDiskSize}GB volume`);
      console.log(`🔌 Ports: ${portsArray.join(', ')}`);
      
      // 1. Crear o verificar PVC para el usuario
      const pvcName = await this.createOrVerifyUserPVC(userId, volumeDiskSize);
      
      // 2. Crear el Pod principal
      await this.createMainPod(podName, userHash, dockerImage, portsArray, containerDiskSize, volumeDiskSize, gpu, enableJupyter);
      
      // 3. Crear Service e Ingress para cada puerto
      const services = [];
      for (const port of portsArray) {
        const serviceName = await this.createServiceForPort(podName, userHash, userId, port);
        const subdomain = generateSecureSubdomain(podName, userId, port);
        const ingressName = await this.createIngressForPort(podName, userHash, port, subdomain);
        
        services.push({
          port,
          serviceName,
          ingressName,
          subdomain,
          url: `https://${subdomain}`
        });
      }
      
      console.log(`✅ Pod ${podName} created successfully with ${services.length} services`);
      
      return {
        podName: `${podName}-${userHash}`,
        pvcName,
        userHash,
        services,
        status: 'creating'
      };
      
    } catch (error) {
      console.error(`❌ Error creating pod ${podName}:`, error);
      throw error;
    }
  }

  // Crear el Pod principal
  async createMainPod(podName, userHash, dockerImage, ports, containerDiskSize, volumeDiskSize, gpu, enableJupyter) {
    if (!this.isKubernetesAvailable()) {
      console.log(`🔧 [SIMULATION] Creating main pod ${podName}-${userHash}`);
      return;
    }

    const podFullName = `${podName}-${userHash}`;
    const pvcName = `workspace-${userHash}`;
    
    // Configurar límites de recursos
    const resourceLimits = {
      memory: `${containerDiskSize}Gi`,
      cpu: '2',
    };
    
    const resourceRequests = {
      memory: `${Math.floor(containerDiskSize * 0.5)}Gi`,
      cpu: '0.5'
    };
    
    // Configurar GPU
    let tolerations = [];
    if (gpu && gpu.includes('rtx')) {
      resourceLimits['nvidia.com/gpu'] = '1';
      resourceRequests['nvidia.com/gpu'] = '1';
      
      tolerations = [{
        key: 'nvidia.com/gpu',
        operator: 'Exists',
        effect: 'NoSchedule'
      }];
    }
    
    // Configurar comandos de inicio para Jupyter si está habilitado
    let command = [];
    let args = [];
    
    if (enableJupyter && ports.includes(8888)) {
      command = ['/bin/bash', '-c'];
      args = [`
        # Instalar Jupyter si no está disponible
        if ! command -v jupyter &> /dev/null; then
          echo "Instalando Jupyter Lab..."
          pip install jupyterlab || apt-get update && apt-get install -y python3-pip && pip3 install jupyterlab
        fi
        
        # Crear directorio de configuración
        mkdir -p /root/.jupyter
        
        # Configurar Jupyter
        echo "c.ServerApp.ip = '0.0.0.0'" > /root/.jupyter/jupyter_lab_config.py
        echo "c.ServerApp.port = 8888" >> /root/.jupyter/jupyter_lab_config.py
        echo "c.ServerApp.allow_root = True" >> /root/.jupyter/jupyter_lab_config.py
        echo "c.ServerApp.token = ''" >> /root/.jupyter/jupyter_lab_config.py
        echo "c.ServerApp.password = ''" >> /root/.jupyter/jupyter_lab_config.py
        
        # Iniciar Jupyter en background
        nohup jupyter lab --config=/root/.jupyter/jupyter_lab_config.py > /tmp/jupyter.log 2>&1 &
        
        # Mantener el contenedor ejecutándose
        tail -f /tmp/jupyter.log
      `];
    }
    
    const pod = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: podFullName,
        labels: {
          app: podName,
          user: userHash,
          'neuropod.online/resource': 'pod',
          'neuropod.online/gpu': gpu || 'none',
          'neuropod.online/jupyter': enableJupyter.toString()
        }
      },
      spec: {
        containers: [{
          name: 'main',
          image: dockerImage,
          ...(command.length > 0 ? { command, args } : {}),
          ports: ports.map(port => ({ 
            containerPort: port,
            name: `port-${port}`,
            protocol: 'TCP'
          })),
          resources: {
            limits: resourceLimits,
            requests: resourceRequests
          },
          volumeMounts: [{
            name: 'workspace',
            mountPath: '/workspace'
          }],
          env: [
            { name: 'NEUROPOD_USER', value: userHash },
            { name: 'NEUROPOD_WORKSPACE', value: '/workspace' },
            { name: 'NEUROPOD_GPU', value: gpu || 'none' },
            { name: 'JUPYTER_ENABLE_LAB', value: 'yes' },
            { name: 'JUPYTER_TOKEN', value: '' }
          ],
          securityContext: {
            runAsUser: 0, // Root para instalaciones
            capabilities: {
              add: ['SYS_ADMIN'] // Para algunos contenedores que lo requieren
            }
          },
          workingDir: '/workspace'
        }],
        volumes: [{
          name: 'workspace',
          persistentVolumeClaim: {
            claimName: pvcName
          }
        }],
        restartPolicy: 'Never',
        ...(tolerations.length > 0 ? { tolerations } : {}),
        // Configuraciones adicionales para estabilidad
        terminationGracePeriodSeconds: 30,
        dnsPolicy: 'ClusterFirst'
      }
    };
    
    try {
      await this.k8sApi.createNamespacedPod('default', pod);
      console.log(`✅ Pod ${podFullName} created successfully`);
    } catch (error) {
      if (error.statusCode === 409) {
        console.log(`⚠️  Pod ${podFullName} already exists`);
      } else {
        throw error;
      }
    }
  }

  // Eliminar todos los recursos de un pod
  async deletePodResources(podName, userHash, services = []) {
    if (!this.isKubernetesAvailable()) {
      console.log(`🔧 [SIMULATION] Deleting resources for ${podName}-${userHash}`);
      return;
    }

    const podFullName = `${podName}-${userHash}`;
    console.log(`🗑️  Deleting resources for pod ${podFullName}`);

    try {
      // Eliminar pod
      try {
        await this.k8sApi.deleteNamespacedPod(podFullName, 'default', undefined, undefined, 0);
        console.log(`✅ Pod ${podFullName} deleted`);
      } catch (err) {
        if (err.statusCode !== 404) {
          console.warn(`⚠️  Warning deleting pod: ${err.message}`);
        }
      }
      
      // Eliminar services e ingress
      for (const service of services) {
        try {
          await this.k8sApi.deleteNamespacedService(service.serviceName, 'default');
          console.log(`✅ Service ${service.serviceName} deleted`);
        } catch (err) {
          if (err.statusCode !== 404) {
            console.warn(`⚠️  Warning deleting service: ${err.message}`);
          }
        }
        
        try {
          await this.k8sNetworkingApi.deleteNamespacedIngress(service.ingressName, 'default');
          console.log(`✅ Ingress ${service.ingressName} deleted`);
        } catch (err) {
          if (err.statusCode !== 404) {
            console.warn(`⚠️  Warning deleting ingress: ${err.message}`);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error deleting pod resources:`, error);
      throw error;
    }
  }

  // Obtener estado de un pod y sus métricas
  async getPodStatus(podName, userHash) {
    if (!this.isKubernetesAvailable()) {
      // Simular estado y métricas en desarrollo
      const statuses = ['running', 'creating', 'stopped'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      return {
        status: randomStatus,
        metrics: randomStatus === 'running' ? {
          cpuUsage: Math.random() * 30,
          memoryUsage: Math.random() * 50,
          gpuUsage: Math.random() * 40,
          uptime: Math.floor(Math.random() * 3600)
        } : null
      };
    }

    const podFullName = `${podName}-${userHash}`;
    
    try {
      const { body: pod } = await this.k8sApi.readNamespacedPod(podFullName, 'default');
      
      let status;
      switch (pod.status.phase) {
        case 'Running':
          status = 'running';
          break;
        case 'Pending':
          status = 'creating';
          break;
        case 'Failed':
        case 'Succeeded':
          status = 'stopped';
          break;
        default:
          status = 'error';
      }
      
      // Obtener métricas si está ejecutándose
      let metrics = null;
      if (status === 'running') {
        metrics = await this.getPodMetrics(podName, userHash);
      }
      
      return { status, metrics };
      
    } catch (error) {
      if (error.statusCode === 404) {
        return { status: 'stopped', metrics: null };
      }
      throw error;
    }
  }

  // Obtener métricas de un pod
  async getPodMetrics(podName, userHash) {
    if (!this.isKubernetesAvailable()) {
      // Simular métricas en desarrollo
      return {
        cpuUsage: Math.random() * 30,
        memoryUsage: Math.random() * 50,
        gpuUsage: Math.random() * 40,
        uptime: Math.floor(Math.random() * 3600)
      };
    }

    try {
      // En un entorno real con metrics-server:
      // const metricsApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
      // const metrics = await metricsApi.getNamespacedCustomObject(
      //   'metrics.k8s.io',
      //   'v1beta1',
      //   'default',
      //   'pods',
      //   `${podName}-${userHash}`
      // );
      
      // Por ahora, retornar métricas simuladas con variación realista
      const baseTime = Date.now();
      return {
        cpuUsage: 15 + (Math.random() * 25), // 15-40%
        memoryUsage: 20 + (Math.random() * 30), // 20-50%
        gpuUsage: Math.random() * 60, // 0-60%
        uptime: Math.floor((baseTime - Date.now() + Math.random() * 3600000) / 1000)
      };
    } catch (error) {
      console.error('Error getting pod metrics:', error);
      return null;
    }
  }

  // Obtener logs de un pod
  async getPodLogs(podName, userHash, lines = 500) {
    if (!this.isKubernetesAvailable()) {
      // Logs simulados en desarrollo
      const now = new Date();
      const timeStr = now.toLocaleTimeString();
      
      return `[${timeStr}] Pod ${podName}-${userHash} iniciado correctamente
[${timeStr}] Descargando imagen de Docker...
[${timeStr}] Iniciando servicios...
[${timeStr}] Servicio principal inicializado
[${timeStr}] Montando volumen de usuario en /workspace
[${timeStr}] Configurando red y puertos
[${timeStr}] Inicializando entorno de usuario
[${timeStr}] Configurando GPU si está disponible
[${timeStr}] Verificando dependencias...
[${timeStr}] ¡Pod listo para ser utilizado!
[${timeStr}] Esperando conexiones en puertos configurados...
[${timeStr}] Sistema funcionando correctamente`;
    }

    const podFullName = `${podName}-${userHash}`;
    
    try {
      const { body: logs } = await this.k8sApi.readNamespacedPodLog(
        podFullName,
        'default',
        'main',
        undefined,
        false,
        undefined,
        undefined,
        undefined,
        lines
      );
      
      return logs || 'No hay logs disponibles aún.';
    } catch (error) {
      if (error.statusCode === 404) {
        return 'Pod no encontrado o aún no ha generado logs.';
      }
      console.error('Error getting pod logs:', error);
      return 'Error al obtener logs del pod.';
    }
  }

  // Capturar token de Jupyter Lab si está habilitado
  async captureJupyterToken(podName, userHash) {
    if (!this.isKubernetesAvailable()) {
      // Token simulado para desarrollo - formato realista
      const chars = 'abcdef0123456789';
      let token = '';
      for (let i = 0; i < 48; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return token;
    }

    try {
      const logs = await this.getPodLogs(podName, userHash, 1000);
      
      // Buscar diferentes formatos de token de Jupyter
      const tokenPatterns = [
        /token=([a-f0-9]{48})/i,
        /\?token=([a-f0-9]{48})/i,
        /jupyter.*token.*?([a-f0-9]{48})/i,
        /token.*?([a-f0-9]{48})/i
      ];
      
      for (const pattern of tokenPatterns) {
        const match = logs.match(pattern);
        if (match && match[1]) {
          console.log(`✅ Jupyter token captured for ${podName}-${userHash}: ${match[1].substring(0, 8)}...`);
          return match[1];
        }
      }
      
      console.log(`⚠️  No Jupyter token found in logs for ${podName}-${userHash}`);
      return null;
    } catch (error) {
      console.error(`❌ Error capturing Jupyter token:`, error);
      return null;
    }
  }

  // Verificar conectividad con Kubernetes
  async healthCheck() {
    if (!this.isKubernetesAvailable()) {
      return {
        status: 'simulation',
        message: 'Running in simulation mode - Kubernetes not available',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Verificar conectividad básica
      await this.k8sApi.listNamespacedPod('default', undefined, undefined, undefined, undefined, 1);
      
      return {
        status: 'healthy',
        message: 'Kubernetes connection successful',
        namespace: 'default',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Listar todos los pods de NeuroPod
  async listNeuropodPods() {
    if (!this.isKubernetesAvailable()) {
      return [];
    }

    try {
      const { body } = await this.k8sApi.listNamespacedPod(
        'default',
        undefined,
        undefined,
        undefined,
        undefined,
        'neuropod.online/resource=pod'
      );
      
      return body.items.map(pod => ({
        name: pod.metadata.name,
        status: pod.status.phase,
        createdAt: pod.metadata.creationTimestamp,
        labels: pod.metadata.labels
      }));
    } catch (error) {
      console.error('Error listing NeuroPod pods:', error);
      return [];
    }
  }

  // Limpiar recursos huérfanos
  async cleanupOrphanedResources() {
    if (!this.isKubernetesAvailable()) {
      console.log('🔧 [SIMULATION] Cleanup orphaned resources');
      return;
    }

    try {
      console.log('🧹 Cleaning up orphaned NeuroPod resources...');
      
      // Listar recursos con etiquetas de NeuroPod
      const labelSelector = 'neuropod.online/resource';
      
      // Limpiar services huérfanos
      const { body: services } = await this.k8sApi.listNamespacedService('default', undefined, undefined, undefined, undefined, labelSelector);
      
      for (const service of services.items) {
        // Verificar si el pod correspondiente existe
        const podName = service.metadata.labels.app + '-' + service.metadata.labels.user;
        try {
          await this.k8sApi.readNamespacedPod(podName, 'default');
        } catch (error) {
          if (error.statusCode === 404) {
            // El pod no existe, eliminar el service
            await this.k8sApi.deleteNamespacedService(service.metadata.name, 'default');
            console.log(`🧹 Cleaned up orphaned service: ${service.metadata.name}`);
          }
        }
      }
      
      // Limpiar ingress huérfanos
      const { body: ingresses } = await this.k8sNetworkingApi.listNamespacedIngress('default', undefined, undefined, undefined, undefined, labelSelector);
      
      for (const ingress of ingresses.items) {
        const podName = ingress.metadata.labels.app + '-' + ingress.metadata.labels.user;
        try {
          await this.k8sApi.readNamespacedPod(podName, 'default');
        } catch (error) {
          if (error.statusCode === 404) {
            await this.k8sNetworkingApi.deleteNamespacedIngress(ingress.metadata.name, 'default');
            console.log(`🧹 Cleaned up orphaned ingress: ${ingress.metadata.name}`);
          }
        }
      }
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

module.exports = new KubernetesService();
