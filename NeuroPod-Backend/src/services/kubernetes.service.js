// Servicio para manejar operaciones de Kubernetes
// Este servicio maneja la creación, gestión y eliminación de recursos de Kubernetes

const k8s = require('@kubernetes/client-node');
const crypto = require('crypto');
const { generateUserHash, generateSecureSubdomain } = require('../utils/podHelpers');
const dotenv = require('dotenv');

dotenv.config();

class KubernetesService {
  constructor() {    
    // Configurar cliente de Kubernetes
    this.kc = new k8s.KubeConfig();
    
    try {
      // En producción: siempre fuera del cluster
      if (process.env.NODE_ENV === 'production') {
        this.kc.loadFromDefault(); // Siempre fuera del cluster
        this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
        this.k8sNetworkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
        console.log('✅ Kubernetes client initialized successfully');
      } else {
        // En desarrollo: solo simulación
        throw new Error('Modo simulación forzado en desarrollo');
      }
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

  // Crear PVC específico para cada pod
  async createPodPVC(podName, userHash, volumeDiskSize) {    
    if (!this.isKubernetesAvailable()) {
      console.log('🔧 [SIMULATION] Creating PVC for pod:', podName);
      return `pvc-${podName}-${userHash}`;
    }

    // ✅ VALIDACIÓN: Verificar que los parámetros no sean null/undefined
    if (!podName || !userHash) {
      throw new Error(`Parámetros inválidos - podName: '${podName}', userHash: '${userHash}'`);
    }
    
    // Sanitizar nombre del pod y generar nombre del PVC
    const sanitizedPodName = podName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const pvcName = `pvc-${sanitizedPodName}-${userHash}`;
    console.log('✅ Generated PVC name:', pvcName);
    
    try {
      // Validar parámetros antes de llamar a la API
      if (!pvcName) {
        throw new Error('pvcName es null o undefined antes de llamar a Kubernetes API');
      }
      
      if (!this.k8sApi || typeof this.k8sApi.readNamespacedPersistentVolumeClaim !== 'function') {
        throw new Error('Cliente de Kubernetes no está correctamente inicializado');
      }
      
      // Verificar si ya existe
      try {
        await this.k8sApi.readNamespacedPersistentVolumeClaim({ name: pvcName, namespace: 'default' });
        console.log(`✅ PVC ${pvcName} already exists`);
        return pvcName;
      } catch (error) {
        // Si es 404, el PVC no existe - esto es normal, proceder a crearlo
        if (error.statusCode === 404 || error.status === 404 || error.code === 404) {
          console.log('🔍 PVC no existe, procediendo a crearlo');
          // Continuar al bloque de creación
        } else {
          // Si es otro error, lanzar la excepción
          throw error;
        }
      }
      
      // Crear PVC ya que no existe
      
      const pvc = {
        apiVersion: 'v1',
        kind: 'PersistentVolumeClaim',
        metadata: {
          name: pvcName,
          labels: {
            app: 'neuropod',
            pod: podName,
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
      
      // Crear PVC
      await this.k8sApi.createNamespacedPersistentVolumeClaim({ namespace: 'default', body: pvc });
      console.log(`✅ PVC ${pvcName} created successfully (${volumeDiskSize}Gi)`);
      return pvcName;
      
    } catch (error) {
      console.error('❌ Error in createPodPVC:', error.message);
      throw error;
    }
  }

  // Crear Service para un puerto específico
  async createServiceForPort(podName, userHash, userId, port) {
    if (!this.isKubernetesAvailable()) {
      console.log(`🔧 [SIMULATION] Creating service for ${podName}-${userHash}-${port}`);
      return `${podName}-${userHash}-${port}-service`;
    }

    // Sanitizar nombre y generar nombre del service
    const sanitizedPodName = podName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const serviceName = `${sanitizedPodName}-${userHash}-${port}-service`;
    
    const service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: serviceName,
        labels: {
          app: sanitizedPodName,
          user: userHash,
          port: `${port}`,
          'neuropod.online/resource': 'service'
        }
      },
      spec: {
        selector: {
          app: sanitizedPodName,
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
      // Crear Service
      await this.k8sApi.createNamespacedService({ namespace: 'default', body: service });
      console.log(`✅ Service ${serviceName} created`);
      return serviceName;
    } catch (error) {
      if (error.statusCode === 409 || error.status === 409 || error.code === 409) {
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

    // Sanitizar nombre y generar nombres del ingress y service
    const sanitizedPodName = podName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const ingressName = `${sanitizedPodName}-${userHash}-${port}-ingress`;
    const serviceName = `${sanitizedPodName}-${userHash}-${port}-service`;
    
    const ingress = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: ingressName,
        labels: {
          app: sanitizedPodName,
          user: userHash,
          port: `${port}`,
          'neuropod.online/resource': 'ingress'
        },
        annotations: {
          'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
          'nginx.ingress.kubernetes.io/proxy-read-timeout': '3600',
          'nginx.ingress.kubernetes.io/proxy-send-timeout': '3600',
          'nginx.ingress.kubernetes.io/proxy-http-version': '1.1',
          'nginx.ingress.kubernetes.io/keep-alive': '75',
          'nginx.ingress.kubernetes.io/keep-alive-requests': '100',
          'nginx.ingress.kubernetes.io/upstream-hash-by': '$remote_addr'
        }
      },
      spec: {
        ingressClassName: process.env.INGRESS_CLASS || 'neuropod-nginx',
        tls: [{
          hosts: [subdomain],
          secretName: process.env.TLS_SECRET_NAME || 'neuropod-tls'
        }],
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
      // Crear Ingress
      await this.k8sNetworkingApi.createNamespacedIngress({ namespace: 'default', body: ingress });
      console.log(`✅ Ingress ${ingressName} created for ${subdomain}`);
      return ingressName;
    } catch (error) {
      if (error.statusCode === 409 || error.status === 409 || error.code === 409) {
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
      
      // 1. Crear PVC específico para este pod
      const pvcName = await this.createPodPVC(podName, userHash, volumeDiskSize);
      
      // 2. Crear el Pod principal
      await this.createMainPod(podName, userHash, dockerImage, portsArray, containerDiskSize, volumeDiskSize, gpu, enableJupyter, pvcName);
      
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
  async createMainPod(podName, userHash, dockerImage, ports, containerDiskSize, volumeDiskSize, gpu, enableJupyter, pvcName) {
    if (!this.isKubernetesAvailable()) {
      console.log(`🔧 [SIMULATION] Creating main pod ${podName}-${userHash}`);
      return;
    }

    // Sanitizar nombre y generar nombre completo del pod
    const sanitizedPodName = podName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const podFullName = `${sanitizedPodName}-${userHash}`;
    console.log('✅ Generated pod name:', podFullName);
    
    // Configurar límites de recursos basados en variables de entorno
    // Valores optimizados para el sistema actual (16GB RAM, 8 CPUs)
    const resourceLimits = {
      memory: process.env.POD_MEMORY_LIMIT || '11Gi',    // Máximo por pod
      cpu: process.env.POD_CPU_LIMIT || '2',             // Máximo por pod
    };
    
    const resourceRequests = {
      memory: process.env.POD_MEMORY_REQUEST || '6Gi',   // Mínimo garantizado
      cpu: process.env.POD_CPU_REQUEST || '1'            // Mínimo garantizado
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
    
    // Generar token seguro para Jupyter Lab
    const jupyterToken = crypto.randomBytes(24).toString('hex');
    console.log(`🔑 Generated Jupyter token for ${podFullName}: ${jupyterToken.substring(0, 8)}...`);
    
    // Configurar comandos de inicio basados en la imagen Docker
    let command = [];
    let args = [];
    
    // Detectar si es imagen de ComfyUI
    const isComfyUIImage = dockerImage.toLowerCase().includes('comfyui');
    
    if (enableJupyter && ports.includes(8888)) {
      command = ['/bin/bash', '-c'];
      
      if (isComfyUIImage) {
        // Script especial para imágenes ComfyUI + Jupyter
        args = [`
          echo "🚀 Iniciando servicios ComfyUI y Jupyter Lab..."
          
          # Instalar Jupyter si no está disponible
          if ! command -v jupyter &> /dev/null; then
            echo "Instalando Jupyter Lab..."
            pip install jupyterlab || apt-get update && apt-get install -y python3-pip && pip3 install jupyterlab
          fi
          
          # Crear directorio de configuración
          mkdir -p /root/.jupyter
          
          # Configurar Jupyter con token seguro
          echo "c.ServerApp.ip = '0.0.0.0'" > /root/.jupyter/jupyter_lab_config.py
          echo "c.ServerApp.port = 8888" >> /root/.jupyter/jupyter_lab_config.py
          echo "c.ServerApp.allow_root = True" >> /root/.jupyter/jupyter_lab_config.py
          echo "c.ServerApp.token = '${jupyterToken}'" >> /root/.jupyter/jupyter_lab_config.py
          echo "c.ServerApp.password = ''" >> /root/.jupyter/jupyter_lab_config.py
          echo "c.ServerApp.open_browser = False" >> /root/.jupyter/jupyter_lab_config.py
          
          echo "🔧 Servicios principales inicializados"
          echo "📁 Montando volumen de usuario en /workspace"
          
          # Crear directorio de trabajo si no existe
          mkdir -p /workspace
          cd /workspace
          
          echo "🌐 Configurando red y puertos (${ports.join(', ')})"
          echo "🔧 Inicializando entorno de usuario"
          
          # Iniciar Jupyter Lab en background
          echo "🚀 Iniciando Jupyter Lab en puerto 8888..."
          nohup jupyter lab --config=/root/.jupyter/jupyter_lab_config.py > /tmp/jupyter.log 2>&1 &
          
          # Esperar a que Jupyter Lab se inicie
          sleep 5
          
          # Iniciar ComfyUI si el puerto 8188 está configurado
          if [[ "${ports.join(',')}" == *"8188"* ]]; then
            echo "🎨 Iniciando ComfyUI en puerto 8188..."
            if [ -f "/app/main.py" ]; then
              nohup python3 /app/main.py --listen 0.0.0.0 --port 8188 > /tmp/comfyui.log 2>&1 &
            else
              echo "⚠️  Archivo /app/main.py no encontrado, buscando alternativas..."
              # Buscar otros archivos de inicio de ComfyUI
              if [ -f "/ComfyUI/main.py" ]; then
                cd /ComfyUI
                nohup python3 main.py --listen 0.0.0.0 --port 8188 > /tmp/comfyui.log 2>&1 &
              elif [ -f "/workspace/ComfyUI/main.py" ]; then
                cd /workspace/ComfyUI
                nohup python3 main.py --listen 0.0.0.0 --port 8188 > /tmp/comfyui.log 2>&1 &
              else
                echo "❌ No se encontró ComfyUI, solo Jupyter Lab estará disponible"
              fi
            fi
          fi
          
          echo "✅ ComfyUI disponible en puerto 8188" || echo "⚠️  ComfyUI no configurado"
          echo "✅ Jupyter Lab disponible en puerto 8888"
          echo "🔑 Jupyter Lab token: ${jupyterToken}"
          echo "✅ ¡Pod listo para ser utilizado!"
          echo "🌐 Esperando conexiones en subdominios..."
          
          # Mostrar estado final de servicios una vez
          echo "=== ESTADO FINAL DE SERVICIOS ==="
          echo "✅ Jupyter Lab configurado en puerto 8888"
          if [[ "${ports.join(',')}" == *"8188"* ]]; then
            echo "✅ ComfyUI configurado en puerto 8188"
          fi
          echo "🔑 Token de acceso generado correctamente"
          echo "📁 Workspace montado en /workspace"
          echo "🚀 Contenedor listo y servicios iniciados"
          echo "📋 Para ver logs en tiempo real, usa el botón 'Logs' en la interfaz"
          
          # Mantener el contenedor vivo sin logs repetitivos
          tail -f /dev/null
        `];
      } else {
        // Script para otras imágenes con solo Jupyter
        args = [`
          echo "🚀 Iniciando Jupyter Lab..."
          
          # Instalar Jupyter si no está disponible
          if ! command -v jupyter &> /dev/null; then
            echo "Instalando Jupyter Lab..."
            pip install jupyterlab || apt-get update && apt-get install -y python3-pip && pip3 install jupyterlab
          fi
          
          # Crear directorio de configuración
          mkdir -p /root/.jupyter
          
          # Configurar Jupyter con token seguro
          echo "c.ServerApp.ip = '0.0.0.0'" > /root/.jupyter/jupyter_lab_config.py
          echo "c.ServerApp.port = 8888" >> /root/.jupyter/jupyter_lab_config.py
          echo "c.ServerApp.allow_root = True" >> /root/.jupyter/jupyter_lab_config.py
          echo "c.ServerApp.token = '${jupyterToken}'" >> /root/.jupyter/jupyter_lab_config.py
          echo "c.ServerApp.password = ''" >> /root/.jupyter/jupyter_lab_config.py
          echo "c.ServerApp.open_browser = False" >> /root/.jupyter/jupyter_lab_config.py
          
          echo "📁 Montando volumen de usuario en /workspace"
          mkdir -p /workspace
          cd /workspace
          
          echo "🔑 Jupyter Lab token: ${jupyterToken}"
          echo "✅ Iniciando Jupyter Lab..."
          
          # Iniciar Jupyter Lab
          jupyter lab --config=/root/.jupyter/jupyter_lab_config.py
        `];
      }
    } else if (isComfyUIImage) {
      // Solo ComfyUI sin Jupyter
      command = ['/bin/bash', '-c'];
      args = [`
        echo "🎨 Iniciando ComfyUI..."
        
        # Crear directorio de trabajo
        mkdir -p /workspace
        cd /workspace
        
        echo "🌐 Configurando ComfyUI en puerto 8188..."
        
        # Buscar y ejecutar ComfyUI
        if [ -f "/app/main.py" ]; then
          python3 /app/main.py --listen 0.0.0.0 --port 8188
        elif [ -f "/ComfyUI/main.py" ]; then
          cd /ComfyUI
          python3 main.py --listen 0.0.0.0 --port 8188
        elif [ -f "/workspace/ComfyUI/main.py" ]; then
          cd /workspace/ComfyUI
          python3 main.py --listen 0.0.0.0 --port 8188
        else
          echo "❌ No se encontró ComfyUI main.py"
          echo "📁 Contenido de /app:"
          ls -la /app/ || echo "Directorio /app no existe"
          echo "📁 Contenido de /:"
          ls -la / | grep -i comfy || echo "No se encontraron directorios ComfyUI"
          # Mantener contenedor vivo para debugging
          tail -f /dev/null
        fi
      `];
    }
    
    const pod = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: podFullName,
        labels: {
          app: sanitizedPodName,  // Usar nombre sanitizado
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
            { name: 'JUPYTER_TOKEN', value: jupyterToken },
            { name: 'COMFYUI_LISTEN', value: '0.0.0.0' },
            { name: 'COMFYUI_PORT', value: '8188' }
          ],
          securityContext: {
            runAsUser: 0, // Root para instalaciones
            capabilities: {
              add: ['SYS_ADMIN'] // Para algunos contenedores que lo requieren
            },
            // Mejorar terminación del proceso
            allowPrivilegeEscalation: false,
            readOnlyRootFilesystem: false
          },
          // Configurar lifecycle para mejor terminación
          lifecycle: {
            preStop: {
              exec: {
                command: ['/bin/sh', '-c', 'pkill -TERM -f jupyter || true; sleep 2']
              }
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
        terminationGracePeriodSeconds: 10,  // Reducido de 30 a 10 segundos
        dnsPolicy: 'ClusterFirst',
        // Configuraciones para mejorar terminación
        activeDeadlineSeconds: 3600,  // 1 hora máximo de ejecución
        hostNetwork: false,
        hostPID: false,
        // Configuración adicional para mejor cleanup
        securityContext: {
          runAsNonRoot: false,
          fsGroup: 0
        }
      }
    };
    
    try {
      // Crear Pod
      await this.k8sApi.createNamespacedPod({ namespace: 'default', body: pod });
      console.log(`✅ Pod ${podFullName} created successfully`);
    } catch (error) {
      if (error.statusCode === 409 || error.status === 409 || error.code === 409) {
        console.log(`⚠️  Pod ${podFullName} already exists`);
      } else {
        throw error;
      }
    }
  }

  // Eliminar todos los recursos de un pod
  async deletePodResources(podName, userHash, services = [], pvcName = null) {
    if (!this.isKubernetesAvailable()) {
      console.log(`🔧 [SIMULATION] Deleting resources for ${podName}-${userHash}`);
      return;
    }

    // Sanitizar nombre y generar nombre completo del pod
    const sanitizedPodName = podName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const podFullName = `${sanitizedPodName}-${userHash}`;
    console.log(`🗑️  Deleting resources for pod ${podFullName}`);

    try {
      // Eliminar pod y esperar a que realmente se elimine
      await this.deletePodAndWait(podFullName);
      
      // Eliminar services e ingress
      for (const service of services) {
        try {
          await this.k8sApi.deleteNamespacedService({ name: service.serviceName, namespace: 'default' });
          console.log(`✅ Service ${service.serviceName} deleted`);
        } catch (err) {
          if (err.statusCode !== 404) {
            console.warn(`⚠️  Warning deleting service: ${err.message}`);
          }
        }
        
        try {
          await this.k8sNetworkingApi.deleteNamespacedIngress({ name: service.ingressName, namespace: 'default' });
          console.log(`✅ Ingress ${service.ingressName} deleted`);
        } catch (err) {
          if (err.statusCode !== 404) {
            console.warn(`⚠️  Warning deleting ingress: ${err.message}`);
          }
        }
      }
      
      // Eliminar PVC específico del pod
      if (pvcName) {
        try {
          await this.k8sApi.deleteNamespacedPersistentVolumeClaim({ name: pvcName, namespace: 'default' });
          console.log(`✅ PVC ${pvcName} deleted`);
        } catch (err) {
          if (err.statusCode !== 404) {
            console.warn(`⚠️  Warning deleting PVC: ${err.message}`);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error deleting pod resources:`, error);
      throw error;
    }
  }

  // 🔧 Nueva función: Eliminar pod y esperar a que realmente se elimine
  async deletePodAndWait(podFullName, maxWaitTime = 30000) {
    try {
      // Intentar eliminación normal primero
      try {
        await this.k8sApi.deleteNamespacedPod({ 
          name: podFullName, 
          namespace: 'default',
          gracePeriodSeconds: 5
        });
        console.log(`🗑️  Deletion command sent for pod ${podFullName}`);
      } catch (err) {
        // 🔧 MEJORA: Verificar múltiples propiedades de error 404
        if (this.isNotFoundError(err)) {
          console.log(`✅ Pod ${podFullName} already deleted`);
          return;
        }
        throw err;
      }
      
      // Esperar a que el pod se elimine realmente
      const startTime = Date.now();
      let podExists = true;
      
      while (podExists && (Date.now() - startTime) < maxWaitTime) {
        try {
          await this.k8sApi.readNamespacedPod({ name: podFullName, namespace: 'default' });
          // Si llegamos aquí, el pod todavía existe
          console.log(`⏳ Pod ${podFullName} still terminating... waiting`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
        } catch (readError) {
          // 🔧 MEJORA: Verificar múltiples propiedades de error 404
          if (this.isNotFoundError(readError)) {
            // Pod eliminado exitosamente
            podExists = false;
            console.log(`✅ Pod ${podFullName} successfully deleted`);
          } else {
            // Error inesperado - pero no lanzar excepción, solo logear
            console.warn(`⚠️  Unexpected error reading pod ${podFullName}:`, readError.message);
            // Asumir que el pod se eliminó si no podemos verificarlo
            podExists = false;
          }
        }
      }
      
      // Si el pod aún existe después del tiempo límite, forzar eliminación
      if (podExists) {
        console.log(`⚠️  Pod ${podFullName} still exists after ${maxWaitTime}ms, forcing deletion...`);
        await this.forceDeletePod(podFullName);
        
        // Esperar un poco más después de la eliminación forzada
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verificar una vez más (pero no lanzar error si falla)
        try {
          await this.k8sApi.readNamespacedPod({ name: podFullName, namespace: 'default' });
          console.log(`⚠️  Pod ${podFullName} still exists after force delete - but continuing anyway`);
          console.log(`🛠️  Manual cleanup: kubectl delete pod ${podFullName} --force --grace-period=0`);
        } catch (finalCheck) {
          if (this.isNotFoundError(finalCheck)) {
            console.log(`✅ Pod ${podFullName} successfully force deleted`);
          } else {
            console.warn(`⚠️  Cannot verify final pod deletion, but assuming success`);
          }
        }
      }
      
      console.log(`✅ Pod deletion process completed for ${podFullName}`);
      
    } catch (error) {
      // 🔧 MEJORA: No lanzar error si es 404, solo logear otros errores
      if (this.isNotFoundError(error)) {
        console.log(`✅ Pod ${podFullName} not found (already deleted)`);
      } else {
        console.error(`❌ Error in deletePodAndWait for ${podFullName}:`, error.message);
        // No lanzar el error para evitar que falle la eliminación completa
        console.log(`⚠️  Continuing with deletion process despite error`);
      }
    }
  }

  // 🔧 Nueva función helper: Verificar si un error es 404/NotFound
  isNotFoundError(error) {
    return (
      error.statusCode === 404 || 
      error.status === 404 || 
      error.code === 404 ||
      (error.body && error.body.includes('not found')) ||
      (error.message && error.message.includes('not found'))
    );
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

    // Sanitizar nombre y generar nombre completo del pod
    const sanitizedPodName = podName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const podFullName = `${sanitizedPodName}-${userHash}`;
    
    try {
      // Leer información del pod desde Kubernetes
      const response = await this.k8sApi.readNamespacedPod({ name: podFullName, namespace: 'default' });
      
      // Detectar automáticamente dónde están los datos del pod
      // Diferentes versiones del cliente de Kubernetes usan estructuras diferentes
      let podData = null;
      if (response.body) {
        podData = response.body;
      } else if (response.response && response.response.body) {
        podData = response.response.body;
      } else if (response.data) {
        podData = response.data;
      } else if (response.status && response.metadata) {
        // Los datos están directamente en response (versión actual)
        podData = response;
      } else {
        throw new Error('No se encontraron datos del pod en la respuesta de Kubernetes');
      }
      
      if (!podData.status) {
        throw new Error('Pod data status is undefined');
      }
      
      // Mapear estado de Kubernetes a estado interno
      let status;
      switch (podData.status.phase) {
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
      if (error.statusCode === 404 || error.status === 404) {
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

    // Sanitizar nombre y generar nombre completo del pod
    const sanitizedPodName = podName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const podFullName = `${sanitizedPodName}-${userHash}`;
    
    console.log(`🔍 [DEBUG] Obteniendo logs para pod:`);
    console.log(`   📝 podName original: '${podName}'`);
    console.log(`   📝 podName sanitizado: '${sanitizedPodName}'`);
    console.log(`   📝 userHash: '${userHash}'`);
    console.log(`   📝 podFullName construido: '${podFullName}'`);
    
    try {
      // Primero verificar si el pod existe
      console.log(`🔍 [DEBUG] Verificando si el pod '${podFullName}' existe...`);
      
      let podExists = false;
      try {
        await this.k8sApi.readNamespacedPod({ name: podFullName, namespace: 'default' });
        podExists = true;
        console.log(`✅ [DEBUG] Pod '${podFullName}' encontrado`);
      } catch (checkError) {
        console.log(`❌ [DEBUG] Pod '${podFullName}' no encontrado:`, checkError.statusCode || checkError.message);
        
        // Listar todos los pods para debugging
        try {
          const { body } = await this.k8sApi.listNamespacedPod({ namespace: 'default' });
          console.log(`🔍 [DEBUG] Pods disponibles en namespace 'default':`);
          body.items.forEach(pod => {
            console.log(`   - ${pod.metadata.name} (status: ${pod.status.phase})`);
          });
        } catch (listError) {
          console.log(`❌ [DEBUG] Error listando pods:`, listError.message);
        }
      }
      
      if (!podExists) {
        return `Pod '${podFullName}' no encontrado en Kubernetes. Verifica que el pod esté ejecutándose.`;
      }
      
      // Leer logs del pod
      console.log(`📜 [DEBUG] Obteniendo logs del pod '${podFullName}' (últimas ${lines} líneas)...`);
      
      const response = await this.k8sApi.readNamespacedPodLog({
        name: podFullName,
        namespace: 'default',
        container: 'main',
        follow: false,
        tailLines: lines
      });
      
      const logs = response.body || response.data || response;
      
      console.log(`✅ [DEBUG] Logs obtenidos exitosamente para '${podFullName}' (${logs ? logs.length : 0} caracteres)`);
      
      if (!logs || logs.trim() === '') {
        return `Pod '${podFullName}' está ejecutándose pero no ha generado logs aún. Espera unos momentos y vuelve a intentar.`;
      }
      
      return logs;
      
    } catch (error) {
      console.error(`❌ [DEBUG] Error obteniendo logs del pod '${podFullName}':`, {
        statusCode: error.statusCode,
        message: error.message,
        response: error.response ? error.response.statusText : 'N/A'
      });
      
      if (error.statusCode === 404) {
        return `Pod '${podFullName}' no encontrado. El pod podría haber sido eliminado o aún no está creado.`;
      }
      
      return `Error al obtener logs del pod '${podFullName}': ${error.message}`;
    }
  }

  // Capturar token de Jupyter Lab si está habilitado
  async captureJupyterToken(podName, userHash) {
    if (!this.isKubernetesAvailable()) {
      // Token simulado para desarrollo - formato realista
      return crypto.randomBytes(24).toString('hex');
    }

    try {
      const logs = await this.getPodLogs(podName, userHash, 1000);
      
      // Buscar diferentes formatos de token de Jupyter
      const tokenPatterns = [
        // Nuestro formato configurado
        /Jupyter Lab token: ([a-f0-9]{48})/i,
        // Formatos estándar de Jupyter
        /token=([a-f0-9]{48})/i,
        /\?token=([a-f0-9]{48})/i,
        /jupyter.*token.*?([a-f0-9]{48})/i,
        /token.*?([a-f0-9]{48})/i,
        // Token en URL
        /http:\/\/.*:(\d+)\/lab\?token=([a-f0-9]{48})/i,
        /https?:\/\/.*\/lab\?token=([a-f0-9]{48})/i
      ];
      
      for (const pattern of tokenPatterns) {
        const match = logs.match(pattern);
        if (match) {
          // Para patrones con múltiples grupos, tomar el token (último grupo)
          const token = match[match.length - 1];
          if (token && token.length === 48) {
            console.log(`✅ Jupyter token captured for ${podName}-${userHash}: ${token.substring(0, 8)}...`);
            return token;
          }
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
      await this.k8sApi.listNamespacedPod({ 
        namespace: 'default', 
        limit: 1 
      });
      
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
      const { body } = await this.k8sApi.listNamespacedPod({
        namespace: 'default',
        labelSelector: 'neuropod.online/resource=pod'
      });
      
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

  // Forzar eliminación de un pod problemático
  async forceDeletePod(podFullName) {
    if (!this.isKubernetesAvailable()) {
      console.log(`🔧 [SIMULATION] Force deleting pod ${podFullName}`);
      return;
    }

    try {
      // Eliminar con grace period 0 para forzar eliminación inmediata
      await this.k8sApi.deleteNamespacedPod({ 
        name: podFullName, 
        namespace: 'default',
        gracePeriodSeconds: 0  // Eliminación inmediata
      });
      console.log(`💥 Pod ${podFullName} force delete command sent`);
      
    } catch (error) {
      if (error.statusCode === 404) {
        console.log(`✅ Pod ${podFullName} already deleted`);
      } else {
        console.error(`❌ Error force deleting pod ${podFullName}:`, error.message);
        console.log(`🛠️  Try manual cleanup: kubectl delete pod ${podFullName} --force --grace-period=0`);
        throw error;
      }
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
      const { body: services } = await this.k8sApi.listNamespacedService({
        namespace: 'default',
        labelSelector: labelSelector
      });
      
      for (const service of services.items) {
        // Verificar si el pod correspondiente existe
        const podName = service.metadata.labels.app + '-' + service.metadata.labels.user;
        try {
          await this.k8sApi.readNamespacedPod({ name: podName, namespace: 'default' });
        } catch (error) {
          if (error.statusCode === 404) {
            // El pod no existe, eliminar el service
            await this.k8sApi.deleteNamespacedService({ name: service.metadata.name, namespace: 'default' });
            console.log(`🧹 Cleaned up orphaned service: ${service.metadata.name}`);
          }
        }
      }
      
      // Limpiar ingress huérfanos
      const { body: ingresses } = await this.k8sNetworkingApi.listNamespacedIngress({
        namespace: 'default',
        labelSelector: labelSelector
      });
      
      for (const ingress of ingresses.items) {
        const podName = ingress.metadata.labels.app + '-' + ingress.metadata.labels.user;
        try {
          await this.k8sApi.readNamespacedPod({ name: podName, namespace: 'default' });
        } catch (error) {
          if (error.statusCode === 404) {
            await this.k8sNetworkingApi.deleteNamespacedIngress({ name: ingress.metadata.name, namespace: 'default' });
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
