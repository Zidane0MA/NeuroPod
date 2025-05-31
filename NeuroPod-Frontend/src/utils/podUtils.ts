import { toast } from "sonner";
import { Pod, SimulatedPod, createSimulatedPod } from "@/types/pod";

// Estado del pod simulado (se mantiene solo 1 pod para demostración)
let simulatedPodState: SimulatedPod | null = null;

// Función para obtener el pod simulado actual
export const getSimulatedPod = (user?: { email: string; role: string }): SimulatedPod | null => {
  if (!simulatedPodState) {
    simulatedPodState = createSimulatedPod(user);
  }
  
  // Verificación de seguridad: asegurar que los arrays siempre existan
  if (simulatedPodState) {
    if (!simulatedPodState.httpServices || !Array.isArray(simulatedPodState.httpServices)) {
      console.warn('httpServices no es un array válido, recreando pod simulado');
      simulatedPodState = createSimulatedPod(user);
    }
    if (!simulatedPodState.tcpServices || !Array.isArray(simulatedPodState.tcpServices)) {
      console.warn('tcpServices no es un array válido, recreando pod simulado');
      simulatedPodState = createSimulatedPod(user);
    }
  }
  
  return simulatedPodState;
};

// Función para cambiar el estado del pod simulado
export const toggleSimulatedPodStatus = (user?: { email: string; role: string }): SimulatedPod => {
  const pod = getSimulatedPod(user);
  if (!pod) {
    throw new Error('No hay pod simulado disponible');
  }

  if (pod.status === "running") {
    // Detener pod
    pod.status = "stopped";
    pod.stats.cpuUsage = 0;
    pod.stats.gpuUsage = 0;
    pod.stats.memoryUsage = 0;
    pod.stats.uptime = 0;
    
    // Actualizar servicios a stopped (con verificación de seguridad)
    if (pod.httpServices && Array.isArray(pod.httpServices)) {
      pod.httpServices.forEach(service => {
        service.status = 'stopped';
      });
    }
    if (pod.tcpServices && Array.isArray(pod.tcpServices)) {
      pod.tcpServices.forEach(service => {
        service.status = 'stopped';
      });
    }
    
    toast.success(`Pod ${pod.podName} detenido correctamente`);
  } else if (pod.status === "stopped") {
    // Iniciar pod
    pod.status = "creating";
    pod.stats.cpuUsage = Math.floor(Math.random() * 30) + 10;
    pod.stats.gpuUsage = Math.floor(Math.random() * 50) + 30;
    pod.stats.memoryUsage = Math.floor(Math.random() * 40) + 30;
    pod.stats.uptime = 60; // 1 minuto
    
    // Actualizar servicios a creating, luego a ready después de un tiempo (con verificación de seguridad)
    if (pod.httpServices && Array.isArray(pod.httpServices)) {
      pod.httpServices.forEach(service => {
        service.status = 'creating';
      });
    }
    if (pod.tcpServices && Array.isArray(pod.tcpServices)) {
      pod.tcpServices.forEach(service => {
        service.status = 'disable'; // SSH permanece deshabilitado
      });
    }
    
    toast.success(`Pod ${pod.podName} iniciando...`);
    
    // Simular que después de 3 segundos cambia a running
    setTimeout(() => {
      if (pod.status === 'creating') {
        pod.status = 'running';
        if (pod.httpServices && Array.isArray(pod.httpServices)) {
          pod.httpServices.forEach(service => {
            service.status = 'ready';
          });
        }
      }
    }, 3000);
  }
  
  pod.lastActive = new Date();
  pod.stats.lastUpdated = new Date();
  
  return pod;
};

// Función para eliminar el pod simulado
export const deleteSimulatedPod = (): boolean => {
  if (simulatedPodState) {
    const podName = simulatedPodState.podName;
    simulatedPodState = null;
    toast.success(`Pod ${podName} eliminado correctamente`);
    return true;
  }
  return false;
};

// Función para recrear el pod simulado (útil después de eliminarlo)
export const recreateSimulatedPod = (user?: { email: string; role: string }): SimulatedPod => {
  simulatedPodState = createSimulatedPod(user);
  return simulatedPodState;
};

// Función para obtener la lista de pods (ahora solo devuelve el pod simulado si existe)
export const getSimulatedPods = (user?: { email: string; role: string }): Pod[] => {
  const pod = getSimulatedPod(user);
  // Verificación adicional antes de devolver
  if (pod && pod.httpServices && pod.tcpServices) {
    return [pod];
  }
  return [];
};
