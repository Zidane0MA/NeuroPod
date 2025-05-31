import api from './api';
import { Pod, PodCreateParams, PodCreateResponse, PodConnectionsResponse, SimulatedPod } from '@/types/pod';
import { getSimulatedPods, toggleSimulatedPodStatus, deleteSimulatedPod } from '@/utils/podUtils';

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
  getPods: async (): Promise<Pod[]> => {
    try {
      const response = await api.get<{ data: Pod[], success: boolean }>('/api/pods');
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error al obtener pods:', error);
      
      // Si estamos en desarrollo y el backend no está disponible, usar pod simulado
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Usando pod simulado (el backend no está disponible)');
        
        // Determinar si es un administrador
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Retornar pod simulado
        return getSimulatedPods(user);
      }
      
      throw error;
    }
  },

  // Obtener pods de un usuario específico (solo para admin)
  getPodsByUser: async (userEmail: string): Promise<Pod[]> => {
    try {
      const response = await api.get<{ data: Pod[], success: boolean }>(`/api/pods?userEmail=${userEmail}`);
      const pods = response.data.data || [];
      
      // Añadir el email del usuario a los pods
      return pods.map(pod => ({
        ...pod,
        userEmail: userEmail
      }));
    } catch (error: any) {
      console.error('Error al obtener pods por usuario:', error);
      
      // Simulación en desarrollo
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Simulando búsqueda de pods por usuario');
        
        // Crear un pod simulado para el usuario buscado
        const simulatedPod = getSimulatedPods({ email: userEmail, role: 'client' })[0];
        if (simulatedPod) {
          return [{ ...simulatedPod, userEmail }];
        }
        
        return [];
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
        
        // Obtener el pod simulado
        const pods = getSimulatedPods();
        const pod = pods.find(p => p.podId === podId);
        
        if (pod) {
          return {
            podId: pod.podId,
            podName: pod.podName,
            status: pod.status,
            httpServices: pod.httpServices,
            tcpServices: pod.tcpServices
          };
        }
        
        // Fallback si no se encuentra el pod
        return {
          podId: podId,
          podName: "Pod-No-Encontrado",
          status: "error",
          httpServices: [],
          tcpServices: []
        };
      }
      
      throw error;
    }
  },
  
  // Obtener detalles de un pod específico
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
        
        // Obtener el pod simulado
        const pods = getSimulatedPods();
        const pod = pods.find(p => p.podId === podId);
        
        if (pod) {
          return {
            pod,
            details: {
              url: `https://${podId}.neuropod.online`,
              subdomain: `${podId}.neuropod.online`,
              createdAt: pod.createdAt.toISOString(),
              lastActive: pod.lastActive.toISOString(),
              cost: 0.5,
              totalCost: 1.75
            }
          };
        }
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
  startPod: async (podId: string): Promise<Pod> => {
    try {
      const response = await api.post<{ success: boolean, data: { podId: string, status: string } }>(`/api/pods/${podId}/start`);
      
      // Obtener el pod actualizado
      const pods = await podService.getPods();
      const updatedPod = pods.find(p => p.podId === podId);
      
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
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedPod = toggleSimulatedPodStatus(user);
        
        return updatedPod;
      }
      
      throw error;
    }
  },
  
  // Detener un pod
  stopPod: async (podId: string): Promise<Pod> => {
    try {
      const response = await api.post<{ success: boolean, data: { podId: string, status: string } }>(`/api/pods/${podId}/stop`);
      
      // Obtener el pod actualizado
      const pods = await podService.getPods();
      const updatedPod = pods.find(p => p.podId === podId);
      
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
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedPod = toggleSimulatedPodStatus(user);
        
        return updatedPod;
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
        deleteSimulatedPod();
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
        
        return `[${timeStr}] Pod simulado iniciado correctamente
[${timeStr}] Iniciando servicios ComfyUI y Jupyter Lab...
[${timeStr}] Servicios principales inicializados
[${timeStr}] Montando volumen de usuario en /workspace
[${timeStr}] Configurando red y puertos (8888, 7860)
[${timeStr}] Inicializando entorno de usuario
[${timeStr}] ComfyUI disponible en puerto 7860
[${timeStr}] Jupyter Lab disponible en puerto 8888
[${timeStr}] ¡Pod listo para ser utilizado!
[${timeStr}] Esperando conexiones en subdominios...`;
      }
      
      throw error;
    }
  }
};
