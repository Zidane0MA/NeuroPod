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

  // Cargar pods propios del admin al iniciar
  useEffect(() => {
    if (!isSearchMode) {
      fetchMyPods();
    }
  }, [isSearchMode]);
  
  const fetchMyPods = async () => {
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
      toast.success(`Pod ${podToDelete.podName} eliminado correctamente`);
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
      <div className="bg-white shadow-sm rounded-lg p-2 mb-8">
        <div className="mb-4">
          <h2 className="text-lg text-gray-700 font-semibold mb-2">Buscar Pods por Usuario</h2>
          <div className="flex space-x-2">
            <div className="flex-1">

              <Input
                id="searchEmail"
                type="email"
                placeholder="cliente@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={searching}
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
              
              {isSearchMode && (
                <Button 
                  variant="outline" 
                  onClick={handleClearSearch}
                  disabled={searching}
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Indicador de modo actual */}
        <div className="flex items-center justify-between pt-3">
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
