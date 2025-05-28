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

// Tipos para el frontend legacy (compatibilidad hacia atrás)
export interface PodPort {
  number: number;
  service: string;
}

export interface LegacyPod {
  id: string;
  name: string;
  status: "running" | "stopped" | "creating" | "error";
  uptime: string;
  cpu: number;
  memory: string;
  gpu: number;
  ports: PodPort[];
  user?: string;
}

// Función para convertir Pod del backend a LegacyPod para compatibilidad
export const convertToLegacyPod = (pod: Pod): LegacyPod => {
  const formatMemory = () => {
    if (pod.status === 'running') {
      const usedGB = (pod.containerDiskSize * pod.stats.memoryUsage / 100).toFixed(1);
      return `${usedGB}GB / ${pod.containerDiskSize}GB`;
    }
    return `0GB / ${pod.containerDiskSize}GB`;
  };

  const formatUptime = () => {
    if (pod.status !== 'running') return '-';
    
    const uptimeHours = Math.floor(pod.stats.uptime / 3600);
    const uptimeMinutes = Math.floor((pod.stats.uptime % 3600) / 60);
    return `${uptimeHours}h ${uptimeMinutes}m`;
  };

  return {
    id: pod.podId,
    name: pod.podName,
    status: pod.status,
    uptime: formatUptime(),
    cpu: pod.stats.cpuUsage,
    memory: formatMemory(),
    gpu: pod.stats.gpuUsage,
    ports: pod.httpServices.map(service => ({
      number: service.port,
      service: service.serviceName
    })),
    user: pod.userEmail
  };
};
