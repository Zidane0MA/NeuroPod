import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Pod, SimulatedPod } from "@/types/pod";
import { toggleSimulatedPodStatus, deleteSimulatedPod } from "@/utils/podUtils";
import { PodsHeader } from "@/components/admin/pods/PodsHeader";
import { PodsContainer } from "@/components/admin/pods/PodsContainer";
import { podService } from "@/services/pod.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, X, Loader2 } from "lucide-react";
// 🔧 NUEVO: Importar hooks de WebSocket
import { useWebSocket } from "@/hooks/useWebSocket";
import webSocketService from "@/services/websocket.service";

const AdminPods = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string>("");
  const [pods, setPods] = useState<Pod[]>([]);
  
  // Estado para manejar carga y errores
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para búsqueda por usuario
  const [searchEmail, setSearchEmail] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);

  // 🔧 NUEVO: Inicializar WebSocket
  const { service: wsService } = useWebSocket();

  const fetchMyPods = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedPods = await podService.getPods();
      setPods(fetchedPods);
      
      // 🔧 NUEVO: Suscribirse a cada pod específico
      console.log('📡 Admin: Suscribiendo a pods específicos:', fetchedPods.map(p => p.podId));
      fetchedPods.forEach(pod => {
        console.log(`📡 Admin: Suscribiendo a pod ${pod.podId}`);
        webSocketService.subscribeToPod(pod.podId, user?.id);
      });
      
    } catch (err: unknown) {
      console.error('Error al cargar pods:', err);
      setError('No se pudieron cargar los pods. Por favor, intenta de nuevo.');
      toast.error('Error al cargar pods');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 🔧 NUEVO: Suscribirse a actualizaciones de pods via WebSocket
  useEffect(() => {
    console.log('🔌 Admin: Inicializando suscripciones WebSocket...');
    
    // Verificar estado de conexión
    const wsStatus = webSocketService.getConnectionStatus();
    console.log('🔌 Admin: Estado WebSocket:', wsStatus);
    
    // Suscribirse a actualizaciones generales de pods
    const unsubscribePodUpdate = webSocketService.onPodUpdate('*', (data) => {
      console.log('📊 Admin: Pod update recibido:', data);
      console.log('📊 Admin: Pods actuales:', pods.map(p => ({ id: p.podId, status: p.status })));
      
      // Actualizar el pod específico en la lista
      setPods(prevPods => {
        const updated = prevPods.map(pod => 
          pod.podId === data.podId 
            ? { 
                ...pod, 
                status: data.status,
                stats: data.stats || pod.stats,
                httpServices: data.httpServices || pod.httpServices,
                tcpServices: data.tcpServices || pod.tcpServices
              }
            : pod
        );
        console.log('📊 Admin: Pods después de actualización:', updated.map(p => ({ id: p.podId, status: p.status })));
        return updated;
      });
    });

    // Suscribirse a notificaciones de pods creados
    const unsubscribePodCreated = webSocketService.onPodCreated((data) => {
      console.log('🎆 Admin: Pod creado:', data);
      // Solo añadir si no estamos en modo de búsqueda o si pertenece al usuario buscado
      if (!isSearchMode || (data.userEmail && data.userEmail === searchEmail)) {
        console.log('🎆 Admin: Recargando pods después de creación...');
        fetchMyPods(); // Recargar lista completa
      }
    });

    // Suscribirse a notificaciones de pods eliminados
    const unsubscribePodDeleted = webSocketService.onPodDeleted((data) => {
      console.log('🗑️ Admin: Pod eliminado:', data);
      setPods(prevPods => {
        const filtered = prevPods.filter(pod => pod.podId !== data.podId);
        console.log('🗑️ Admin: Pods después de eliminación:', filtered.map(p => ({ id: p.podId, status: p.status })));
        return filtered;
      });
    });

    // Cleanup
    return () => {
      console.log('🔌 Admin: Limpiando suscripciones WebSocket...');
      unsubscribePodUpdate();
      unsubscribePodCreated();
      unsubscribePodDeleted();
    };
  }, [isSearchMode, searchEmail, fetchMyPods, pods]); // Dependencias para re-suscribirse cuando cambie el modo

  // Cargar pods propios del admin al iniciar
  useEffect(() => {
    if (!isSearchMode) {
      fetchMyPods();
    }
  }, [isSearchMode, fetchMyPods]);

  const handleSearchByEmail = async () => {
    if (!searchEmail.trim()) {
      toast.error('Por favor, ingresa un correo electrónico');
      return;
    }
    
    setSearching(true);
    setLoading(true);
    setError(null);
    
    try {
      const userPods = await podService.getPodsByUser(searchEmail.trim());
      setPods(userPods);
      setIsSearchMode(true);
      
      // 🔧 NUEVO: Suscribirse a pods del usuario buscado
      console.log('📡 Admin: Suscribiendo a pods del usuario buscado:', userPods.map(p => p.podId));
      userPods.forEach(pod => {
        console.log(`📡 Admin: Suscribiendo a pod ${pod.podId} del usuario ${searchEmail}`);
        webSocketService.subscribeToPod(pod.podId, user?.id);
      });
      
      if (userPods.length === 0) {
        toast.info(`No se encontraron pods para ${searchEmail}`);
      } else {
        toast.success(`Encontrados ${userPods.length} pod(s) para ${searchEmail}`);
      }
    } catch (error) {
      console.error('Error searching pods by email:', error);
      setError(`Error al buscar pods para ${searchEmail}`);
      toast.error('Error al buscar pods por correo');
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };
  
  const handleClearSearch = () => {
    setSearchEmail('');
    setIsSearchMode(false);
    // fetchMyPods se llamará automáticamente por el useEffect
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchByEmail();
    }
  };
  
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
[${timeStr}] 🎃 Este es un pod de demostración para mostrar funcionalidades
[${timeStr}] Usuario: ${pod.userEmail || 'demo-user'}`;
        
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
        if (isSearchMode && searchEmail) {
          const userPods = await podService.getPodsByUser(searchEmail);
          setPods(userPods);
        } else {
          const fetchedPods = await podService.getPods();
          setPods(fetchedPods);
        }
      } catch (fetchErr) {
        console.error('Error al recargar pods:', fetchErr);
      }
      toast.error('Error al eliminar el pod');
    }
  };

  return (
    <DashboardLayout title="Administración de Pods">
      <PodsHeader user={user} />
      
      {/* Sección de búsqueda por usuario */}
      <div className="bg-gray-50 border border-gray-200 shadow-sm rounded-lg p-6 mt-8 mb-8">
        <div className="mb-6">
          <h2 className="text-lg text-gray-700 font-semibold mb-3">Buscar Pods por Usuario</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="searchEmail"
                type="email"
                placeholder="cliente@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={searching}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <Button 
                onClick={handleSearchByEmail}
                disabled={searching || !searchEmail.trim()}
                className="min-w-[110px]"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Search className="h-4 w-4 mr-1" />
                )}
                Buscar
              </Button>
              {isSearchMode && (
                <Button 
                  variant="outline" 
                  onClick={handleClearSearch}
                  disabled={searching}
                  className="min-w-[110px]"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>
        {/* Indicador de modo actual */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isSearchMode ? (
              <span className="flex items-center">
                <Search className="h-4 w-4 mr-1" />
                Mostrando pods de: <strong className="ml-1">{searchEmail}</strong>
              </span>
            ) : (
              <span>Mostrando tus pods de administrador</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {pods.length} pod(s) encontrado(s)
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <div className="space-x-2">
              <button 
                onClick={isSearchMode ? () => handleSearchByEmail() : fetchMyPods} 
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
                Reintentar
              </button>
              {isSearchMode && (
                <button 
                  onClick={handleClearSearch} 
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors">
                  Ver mis pods
                </button>
              )}
            </div>
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

export default AdminPods;
