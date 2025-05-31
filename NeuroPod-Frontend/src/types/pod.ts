// Tipos relacionados con pods según las especificaciones del backend

export interface HttpService {
  port: number;
  serviceName: string;
  url: string;
  isCustom: boolean;
  status: 'creating' | 'ready' | 'error' | 'stopped';
  jupyterToken?: string;
  kubernetesServiceName?: string;
  kubernetesIngressName?: string;
}

export interface TcpService {
  port: number;
  serviceName: string;
  url: string;
  isCustom: boolean;
  status: 'creating' | 'ready' | 'error' | 'stopped' | 'disable';
}

export interface PodStats {
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  uptime: number;
  lastUpdated: Date;
}

export interface Pod {
  podId: string;
  podName: string;
  userId: string;
  userHash: string;
  createdBy: string;
  
  // Configuración de despliegue
  deploymentType: 'template' | 'docker';
  templateId?: string;
  dockerImage?: string;
  gpu: string;
  containerDiskSize: number;
  volumeDiskSize: number;
  enableJupyter: boolean;
  
  // Estado actual
  status: 'creating' | 'running' | 'stopped' | 'error';
  
  // Servicios
  httpServices: HttpService[];
  tcpServices: TcpService[];
  
  // Metadatos
  createdAt: Date;
  lastActive: Date;
  
  // Kubernetes info
  kubernetesResources: {
    podName: string;
    pvcName: string;
    namespace: string;
  };
  
  // Estadísticas
  stats: PodStats;
  
  // Para mostrar en la UI del administrador
  userEmail?: string;
}

export interface PodConnectionsResponse {
  podId: string;
  podName: string;
  status: string;
  httpServices: HttpService[];
  tcpServices: TcpService[];
  message?: string;
}

export interface PodCreateParams {
  name: string;
  deploymentType: 'template' | 'docker';
  template?: string;
  dockerImage?: string;
  gpu: string;
  containerDiskSize: number;
  volumeDiskSize: number;
  ports: string;
  enableJupyter: boolean;
  assignToUser?: string; // Solo para administradores
}

export interface PodCreateResponse {
  success: boolean;
  data: {
    podId: string;
    podName: string;
    status: string;
    message: string;
  };
}

// Tipo para simulación en frontend (solo para desarrollo y demostración)
export interface SimulatedPod extends Pod {
  // Campos adicionales para simulación si son necesarios
  isSimulated: true;
}

// Función para crear un pod simulado con el formato moderno
export const createSimulatedPod = (user?: { email: string; role: string }): SimulatedPod => {
  const now = new Date();
  const podId = 'simulated-pod-1';
  
  return {
    podId,
    podName: 'ComfyUI-Demo',
    userId: user?.email || 'demo-user',
    userHash: 'demo-hash-123',
    createdBy: user?.email || 'demo-user',
    
    // Configuración de despliegue
    deploymentType: 'template',
    templateId: 'comfyui-template',
    gpu: 'rtx-4050',
    containerDiskSize: 8,
    volumeDiskSize: 20,
    enableJupyter: true,
    
    // Estado actual
    status: 'running',
    
    // Servicios
    httpServices: [
      {
        port: 8888,
        serviceName: 'Jupyter Lab',
        url: `https://${podId}-8888.neuropod.online`,
        isCustom: false,
        status: 'ready'
      },
      {
        port: 7860,
        serviceName: 'ComfyUI',
        url: `https://${podId}-7860.neuropod.online`,
        isCustom: false,
        status: 'ready'
      }
    ],
    tcpServices: [
      {
        port: 22,
        serviceName: 'SSH',
        url: `tcp://${podId}-22.neuropod.online:22`,
        isCustom: false,
        status: 'disable'
      }
    ],
    
    // Metadatos
    createdAt: now,
    lastActive: now,
    
    // Kubernetes info
    kubernetesResources: {
      podName: `k8s-${podId}`,
      pvcName: `pvc-${podId}`,
      namespace: 'default'
    },
    
    // Estadísticas
    stats: {
      cpuUsage: 25,
      memoryUsage: 52,
      gpuUsage: 65,
      uptime: 8100, // 2h 15m
      lastUpdated: now
    },
    
    // Para mostrar en la UI del administrador
    userEmail: user?.email,
    
    // Marca de simulación
    isSimulated: true
  };
};
