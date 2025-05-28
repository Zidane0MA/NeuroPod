import api from './api';
import { Pod, PodCreateParams, PodCreateResponse, PodConnectionsResponse, LegacyPod, convertToLegacyPod } from '@/types/pod';

export interface PodLogsResponse {
  success: boolean;
  data: {
    logs: string;
  };
}

export interface PodDetailsResponse {
  pod: Pod;
  details: {
    url: string;
    subdomain: string;
    createdAt: string;
    lastActive: string;
    cost: number;
    totalCost: number;
  };
}

export const podService = {
  // Obtener todos los pods del usuario actual
  getPods: async (): Promise<LegacyPod[]> => {
    try {
      const response = await api.get<{ data: Pod[], success: boolean }>('/api/pods');
      const pods = response.data.data || [];
      
      // Convertir a formato legacy para compatibilidad
      return pods.map(convertToLegacyPod);
    } catch (error: any) {
      console.error('Error al obtener pods:', error);
      
      // Si estamos en desarrollo y el backend no está disponible, usar datos simulados
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Usando datos de pods simulados (el backend no está disponible)');
        
        // Determinar si es un administrador
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isAdmin = user.role === 'admin';
        
        // Retornar datos simulados según el rol
        const simulatedPods: LegacyPod[] = [];
        
        if (isAdmin) {
          // Para administradores: pods propios y de usuarios
          simulatedPods.push(
            {
              id: "pod-1",
              name: "ComfyUI-Admin",
              status: "running",
              uptime: "2h 15m",
              cpu: 25,
              memory: "4.2GB / 8GB",
              gpu: 65,
              ports: [
                { number: 8888, service: "Jupyter Lab" },
                { number: 7860, service: "ComfyUI" }
              ],
              user: user.email
            },
            {
              id: "pod-2",
              name: "Ubuntu-Dev",
              status: "stopped",
              uptime: "-",
              cpu: 0,
              memory: "0GB / 4GB",
              gpu: 0,
              ports: [
                { number: 8888, service: "Jupyter Lab" },
                { number: 22, service: "SSH" }
              ],
              user: user.email
            }
          );
        } else {
          // Para clientes: solo sus propios pods
          simulatedPods.push(
            {
              id: "pod-1",
              name: "ComfyUI-1",
              status: "running",
              uptime: "2h 15m",
              cpu: 25,
              memory: "4.2GB / 8GB",
              gpu: 65,
              ports: [
                { number: 8888, service: "Jupyter Lab" },
                { number: 7860, service: "ComfyUI" }
              ]
            },
            {
              id: "pod-2",
              name: "Ubuntu-Dev",
              status: "stopped",
              uptime: "-",
              cpu: 0,
              memory: "0GB / 4GB",
              gpu: 0,
              ports: [
                { number: 8888, service: "Jupyter Lab" },
                { number: 22, service: "SSH" }
              ]
            }
          );
        }
        
        return simulatedPods;
      }
      
      throw error;
    }
  },

  // Obtener pods de un usuario específico (solo para admin)
  getPodsByUser: async (userEmail: string): Promise<LegacyPod[]> => {
    try {
      const response = await api.get<{ data: Pod[], success: boolean }>(`/api/pods?userEmail=${userEmail}`);
      const pods = response.data.data || [];
      
      // Convertir a formato legacy y añadir el email del usuario
      return pods.map(pod => ({
        ...convertToLegacyPod(pod),
        user: userEmail
      }));
    } catch (error: any) {
      console.error('Error al obtener pods por usuario:', error);
      
      // Simulación en desarrollo
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Simulando pods de usuario específico');
        
        return [
          {
            id: "pod-user-1",
            name: "ComfyUI-Usuario",
            status: "running",
            uptime: "1h 30m",
            cpu: 35,
            memory: "3.5GB / 8GB",
            gpu: 45,
            ports: [
              { number: 8888, service: "Jupyter Lab" },
              { number: 7860, service: "ComfyUI" }
            ],
            user: userEmail
          }
        ];
      }
      
      throw error;
    }
  },
  
  // Obtener información de conexiones de un pod
  getPodConnections: async (podId: string): Promise<PodConnectionsResponse> => {
    try {
      const response = await api.get<{ data: PodConnectionsResponse, success: boolean }>(`/api/pods/${podId}/connections`);
      return response.data.data;
    } catch (error: any) {
      console.error('Error al obtener conexiones del pod:', error);
      
      // Simulación en desarrollo
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Simulando conexiones de pod');
        
        return {
          podId: podId,
          podName: "Pod-Simulado",
          status: "running",
          httpServices: [
            {
              port: 8888,
              serviceName: "Jupyter Lab",
              url: `https://pod-${podId}-8888.neuropod.online`,
              isCustom: false,
              status: "ready"
            },
            {
              port: 7860,
              serviceName: "ComfyUI",
              url: `https://pod-${podId}-7860.neuropod.online`,
              isCustom: false,
              status: "ready"
            }
          ],
          tcpServices: [
            {
              port: 22,
              serviceName: "SSH",
              url: `tcp://pod-${podId}-22.neuropod.online:22`,
              isCustom: false,
              status: "disable"
            }
          ]
        };
      }
      
      throw error;
    }
  },
  
  // Obtener detalles de un pod específico (mantener para compatibilidad)
  getPodDetails: async (podId: string): Promise<PodDetailsResponse> => {
    try {
      const response = await api.get<{ pod: Pod, details: any, success: boolean }>(`/api/pods/${podId}`);
      return {
        pod: response.data.pod,
        details: response.data.details
      };
    } catch (error: any) {
      console.error('Error al obtener detalles del pod:', error);
      
      // Simulación en desarrollo
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Usando datos simulados de detalles de pod');
        
        // Crear un pod simulado para compatibilidad
        const simulatedPod: Pod = {
          podId: podId,
          podName: "Pod-Simulado",
          userId: "user-123",
          userHash: "hash-123",
          createdBy: "user-123",
          deploymentType: "template",
          templateId: "template-1",
          gpu: "rtx-4050",
          containerDiskSize: 8,
          volumeDiskSize: 20,
          enableJupyter: true,
          status: "running",
          httpServices: [
            {
              port: 8888,
              serviceName: "Jupyter Lab",
              url: `https://pod-${podId}-8888.neuropod.online`,
              isCustom: false,
              status: "ready"
            }
          ],
          tcpServices: [],
          createdAt: new Date(),
          lastActive: new Date(),
          kubernetesResources: {
            podName: `pod-${podId}`,
            pvcName: `pvc-${podId}`,
            namespace: "default"
          },
          stats: {
            cpuUsage: 30,
            memoryUsage: 50,
            gpuUsage: 40,
            uptime: 13500,
            lastUpdated: new Date()
          }
        };
        
        return {
          pod: simulatedPod,
          details: {
            url: `https://pod-${podId}.neuropod.online`,
            subdomain: `pod-${podId}.neuropod.online`,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            cost: 0.5,
            totalCost: 1.75
          }
        };
      }
      
      throw error;
    }
  },
  
  // Crear un nuevo pod
  createPod: async (params: PodCreateParams): Promise<PodCreateResponse> => {
    try {
      console.log('Enviando solicitud de creación de pod:', params);
      
      const response = await api.post<PodCreateResponse>('/api/pods', params);
      
      console.log('Respuesta de creación de pod:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('Error al crear pod:', error);
      
      // Simulación en desarrollo
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Simulando creación de pod');
        
        return {
          success: true,
          data: {
            podId: `pod-${Date.now()}`,
            podName: params.name,
            status: 'creating',
            message: 'Pod creándose. Por favor espere unos minutos.'
          }
        };
      }
      
      throw error;
    }
  },
  
  // Iniciar un pod
  startPod: async (podId: string): Promise<LegacyPod> => {
    try {
      const response = await api.post<{ success: boolean, data: { podId: string, status: string } }>(`/api/pods/${podId}/start`);
      
      // Obtener el pod actualizado
      const pods = await podService.getPods();
      const updatedPod = pods.find(p => p.id === podId);
      
      if (updatedPod) {
        return { ...updatedPod, status: 'creating' };
      }
      
      throw new Error('Pod no encontrado después de iniciar');
    } catch (error: any) {
      console.error('Error al iniciar pod:', error);
      
      // Simulación en desarrollo
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Simulando inicio de pod');
        
        return {
          id: podId,
          name: "Pod-Simulado",
          status: "creating",
          uptime: "0h 1m",
          cpu: Math.floor(Math.random() * 30) + 10,
          gpu: Math.floor(Math.random() * 50) + 30,
          memory: "2.5GB / 8GB",
          ports: [
            { number: 8888, service: "Jupyter Lab" }
          ]
        };
      }
      
      throw error;
    }
  },
  
  // Detener un pod
  stopPod: async (podId: string): Promise<LegacyPod> => {
    try {
      const response = await api.post<{ success: boolean, data: { podId: string, status: string } }>(`/api/pods/${podId}/stop`);
      
      // Obtener el pod actualizado
      const pods = await podService.getPods();
      const updatedPod = pods.find(p => p.id === podId);
      
      if (updatedPod) {
        return { ...updatedPod, status: 'stopped' };
      }
      
      throw new Error('Pod no encontrado después de detener');
    } catch (error: any) {
      console.error('Error al detener pod:', error);
      
      // Simulación en desarrollo
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Simulando detención de pod');
        
        return {
          id: podId,
          name: "Pod-Simulado",
          status: "stopped",
          uptime: "-",
          cpu: 0,
          gpu: 0,
          memory: "0GB / 8GB",
          ports: [
            { number: 8888, service: "Jupyter Lab" }
          ]
        };
      }
      
      throw error;
    }
  },
  
  // Eliminar un pod
  deletePod: async (podId: string): Promise<void> => {
    try {
      await api.delete(`/api/pods/${podId}`);
    } catch (error: any) {
      console.error('Error al eliminar pod:', error);
      
      // Simulación en desarrollo
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Simulando eliminación de pod');
        return;
      }
      
      throw error;
    }
  },
  
  // Obtener logs de un pod
  getPodLogs: async (podId: string): Promise<string> => {
    try {
      const response = await api.get<PodLogsResponse>(`/api/pods/${podId}/logs`);
      return response.data.data.logs;
    } catch (error: any) {
      console.error('Error al obtener logs del pod:', error);
      
      // Simulación en desarrollo
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Simulando logs de pod');
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        
        return `[${timeStr}] Pod iniciado correctamente
[${timeStr}] Iniciando servicios...
[${timeStr}] Servicio principal inicializado
[${timeStr}] Montando volumen de usuario en /workspace
[${timeStr}] Configurando red
[${timeStr}] Inicializando entorno de usuario
[${timeStr}] ¡Pod listo para ser utilizado!
[${timeStr}] Esperando conexiones...`;
      }
      
      throw error;
    }
  }
};
