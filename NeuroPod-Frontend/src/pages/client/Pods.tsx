import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { LegacyPod } from "@/types/pod";
import { ClientPodsHeader } from "@/components/client/pods/ClientPodsHeader";
import { PodsContainer } from "@/components/client/pods/PodsContainer";
import { podService } from "@/services/pod.service";

const ClientPods = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string>("");
  const [pods, setPods] = useState<LegacyPod[]>([]);
  
  // Estado para manejar carga y errores
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar pods desde el servicio al iniciar
  useEffect(() => {
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

    fetchPods();
  }, []);
  
  const viewLogs = async (podId: string) => {
    try {
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
      const pod = pods.find(p => p.id === podId);
      if (!pod) return;

      // Actualizar la UI inmediatamente para feedback
      setPods(prevPods => 
        prevPods.map(p => 
          p.id === podId ? { ...p, status: p.status === 'running' ? 'stopped' : (p.status === 'stopped' ? 'creating' : p.status) } : p
        )
      );

      if (pod.status === 'running') {
        // Detener el pod
        const stoppedPod = await podService.stopPod(podId);
        setPods(prevPods => 
          prevPods.map(p => p.id === podId ? stoppedPod : p)
        );
        toast.success(`Pod ${pod.name} detenido correctamente`);
      } else if (pod.status === 'stopped') {
        // Iniciar el pod
        const startedPod = await podService.startPod(podId);
        setPods(prevPods => 
          prevPods.map(p => p.id === podId ? startedPod : p)
        );
        toast.success(`Pod ${pod.name} iniciando...`);
      }
    } catch (err) {
      console.error('Error al cambiar estado del pod:', err);
      // Revertir el cambio en la UI si hay error
      setPods(prevPods => 
        prevPods.map(p => 
          p.id === podId ? { ...p, status: p.status === 'creating' ? 'stopped' : (p.status === 'stopped' ? 'running' : p.status) } : p
        )
      );
      toast.error('Error al cambiar el estado del pod');
    }
  };
  
  // Manejar eliminación de pods
  const handleDeletePod = async (podId: string) => {
    try {
      // Actualizar la UI inmediatamente para feedback
      const podToDelete = pods.find(p => p.id === podId);
      setPods(prevPods => prevPods.filter(p => p.id !== podId));
      
      // Eliminar en el backend
      await podService.deletePod(podId);
      toast.success(podToDelete ? `Pod ${podToDelete.name} eliminado correctamente` : "Pod eliminado correctamente");
    } catch (err) {
      console.error('Error al eliminar pod:', err);
      // Recargar los pods si hay error
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
