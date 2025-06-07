import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Pod, SimulatedPod } from "@/types/pod";
import { toggleSimulatedPodStatus, deleteSimulatedPod } from "@/utils/podUtils";
import { ClientPodsHeader } from "@/components/client/pods/ClientPodsHeader";
import { PodsContainer } from "@/components/client/pods/PodsContainer";
import { podService } from "@/services/pod.service";
// 🔧 NUEVO: Importar hooks de WebSocket
import { useWebSocket } from "@/hooks/useWebSocket";
import webSocketService from "@/services/websocket.service";

const ClientPods = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string>("");
  const [pods, setPods] = useState<Pod[]>([]);
  
  // Estado para manejar carga y errores
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 🔧 NUEVO: Inicializar WebSocket
  const { service: wsService } = useWebSocket();

  // 🔧 NUEVO: Suscribirse a actualizaciones de pods via WebSocket
  useEffect(() => {
    // Suscribirse a actualizaciones de pods (solo los del usuario actual)
    const unsubscribePodUpdate = webSocketService.onPodUpdate('*', (data) => {
      console.log('📊 Cliente: Pod update recibido:', data);
      
      // Actualizar el pod específico en la lista
      setPods(prevPods => 
        prevPods.map(pod => 
          pod.podId === data.podId 
            ? { 
                ...pod, 
                status: data.status,
                stats: data.stats || pod.stats,
                httpServices: data.httpServices || pod.httpServices,
                tcpServices: data.tcpServices || pod.tcpServices
              }
            : pod
        )
      );
    });

    // Suscribirse a notificaciones de pods creados
    const unsubscribePodCreated = webSocketService.onPodCreated((data) => {
      console.log('🎆 Cliente: Pod creado:', data);
      // Recargar lista para obtener el nuevo pod
      fetchPods();
    });

    // Suscribirse a notificaciones de pods eliminados
    const unsubscribePodDeleted = webSocketService.onPodDeleted((data) => {
      console.log('🗑️ Cliente: Pod eliminado:', data);
      setPods(prevPods => prevPods.filter(pod => pod.podId !== data.podId));
    });

    // Cleanup
    return () => {
      unsubscribePodUpdate();
      unsubscribePodCreated();
      unsubscribePodDeleted();
    };
  }, []); // Sin dependencias porque las suscripciones son estáticas para el cliente

  // 🔧 NUEVO: Función para cargar pods (extraída para reutilización)
  const fetchPods = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedPods = await podService.getPods();
      setPods(fetchedPods);
    } catch (err: unknown) {
      console.error('Error al cargar pods:', err);
      setError('No se pudieron cargar los pods. Por favor, intenta de nuevo.');
      toast.error('Error al cargar pods');
    } finally {
      setLoading(false);
    }
  };

  // Cargar pods desde el servicio al iniciar
  useEffect(() => {
    fetchPods();
  }, []);
  
  const viewLogs = async (podId: string) => {
    try {
      const pod = pods.find(p => p.podId === podId);
      const isSimulated = pod && (pod as SimulatedPod).isSimulated === true;
      
      if (isSimulated) {
        // Para pods simulados, usar logs predefinidos
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        
        const simulatedLogs = `[${timeStr}] Pod simulado iniciado correctamente
[${timeStr}] Iniciando servicios ComfyUI y Jupyter Lab...
[${timeStr}] Servicios principales inicializados
[${timeStr}] Montando volumen de usuario en /workspace
[${timeStr}] Configurando red y puertos (8888, 7860)
[${timeStr}] Inicializando entorno de usuario
[${timeStr}] ComfyUI disponible en puerto 7860
[${timeStr}] Jupyter Lab disponible en puerto 8888
[${timeStr}] ¡Pod listo para ser utilizado!
[${timeStr}] Esperando conexiones en subdominios...
[${timeStr}] 🎃 Este es un pod de demostración para mostrar funcionalidades`;
        
        setLogs(simulatedLogs);
        return;
      }
      
      // Para pods reales, usar la API
      setLogs('Cargando logs...');
      const podLogs = await podService.getPodLogs(podId);
      setLogs(podLogs);
    } catch (err) {
      console.error('Error al obtener logs:', err);
      setLogs('Error al cargar los logs. Por favor, intenta de nuevo.');
      toast.error('Error al cargar logs');
    }
  };

  // Manejar inicio/parada de pods
  const handleTogglePod = async (podId: string) => {
    try {
      const pod = pods.find(p => p.podId === podId);
      if (!pod) return;

      // Verificar si es un pod simulado
      const isSimulated = (pod as SimulatedPod).isSimulated === true;

      if (isSimulated) {
        // Para pods simulados, usar las utilidades locales
        const updatedPod = toggleSimulatedPodStatus({ email: user.email, role: user.role ?? "user" });
        if (updatedPod) {
          setPods(prevPods => 
            prevPods.map(p => p.podId === podId ? updatedPod : p)
          );
        }
        return;
      }

      // Para pods reales, usar la lógica existente
      // Actualizar la UI inmediatamente para feedback
      setPods(prevPods => 
        prevPods.map(p => 
          p.podId === podId ? { ...p, status: p.status === 'running' ? 'stopped' : (p.status === 'stopped' ? 'creating' : p.status) } : p
        )
      );

      if (pod.status === 'running') {
        // Detener el pod
        const stoppedPod = await podService.stopPod(podId);
        setPods(prevPods => 
          prevPods.map(p => p.podId === podId ? stoppedPod : p)
        );
        toast.success(`Pod ${pod.podName} detenido correctamente`);
      } else if (pod.status === 'stopped') {
        // Iniciar el pod
        const startedPod = await podService.startPod(podId);
        setPods(prevPods => 
          prevPods.map(p => p.podId === podId ? startedPod : p)
        );
        toast.success(`Pod ${pod.podName} iniciando...`);
      }
    } catch (err) {
      console.error('Error al cambiar estado del pod:', err);
      // Revertir el cambio en la UI si hay error (solo para pods reales)
      const pod = pods.find(p => p.podId === podId);
      const isSimulated = pod && (pod as SimulatedPod).isSimulated === true;
      
      if (!isSimulated) {
        setPods(prevPods => 
          prevPods.map(p => 
            p.podId === podId ? { ...p, status: p.status === 'creating' ? 'stopped' : (p.status === 'stopped' ? 'running' : p.status) } : p
          )
        );
      }
      toast.error('Error al cambiar el estado del pod');
    }
  };
  
  // Manejar eliminación de pods
  const handleDeletePod = async (podId: string) => {
    try {
      const podToDelete = pods.find(p => p.podId === podId);
      if (!podToDelete) return;

      // Verificar si es un pod simulado
      const isSimulated = (podToDelete as SimulatedPod).isSimulated === true;

      if (isSimulated) {
        // Para pods simulados, usar las utilidades locales
        const deleted = deleteSimulatedPod();
        if (deleted) {
          setPods(prevPods => prevPods.filter(p => p.podId !== podId));
        }
        return;
      }

      // Para pods reales, usar la lógica existente
      // Actualizar la UI inmediatamente para feedback
      setPods(prevPods => prevPods.filter(p => p.podId !== podId));
      
      // Eliminar en el backend
      await podService.deletePod(podId);
      // 🔧 ELIMINADO: toast.success - ahora WebSocket maneja las notificaciones
    } catch (err) {
      console.error('Error al eliminar pod:', err);
      // Recargar los pods si hay error (solo para pods reales)
      try {
        const fetchedPods = await podService.getPods();
        setPods(fetchedPods);
      } catch (fetchErr) {
        console.error('Error al recargar pods:', fetchErr);
      }
      toast.error('Error al eliminar el pod');
    }
  };

  return (
    <DashboardLayout title="Mis Pods">
      <ClientPodsHeader user={user} />
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
              Reintentar
            </button>
          </div>
        </div>
      ) : (
        <PodsContainer 
          pods={pods}
          logs={logs}
          onTogglePod={handleTogglePod}
          onDeletePod={handleDeletePod}
          viewLogs={viewLogs}
        />
      )}
    </DashboardLayout>
  );
};

export default ClientPods;
