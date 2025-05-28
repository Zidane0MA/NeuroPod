import { toast } from "sonner";
import { LegacyPod, PodPort } from "@/types/pod";

// Lista de pods iniciales para cliente
export const initialClientPods: LegacyPod[] = [
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
    ],
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
  },
];

// Lista de pods iniciales para admin
export const initialAdminPods: LegacyPod[] = [
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
    ],
    user: "admin@example.com",
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
    user: "admin@example.com",
  },
  {
    id: "pod-3",
    name: "DataScience-1",
    status: "running",
    uptime: "5h 43m",
    cpu: 45,
    memory: "12GB / 16GB",
    gpu: 78,
    ports: [
      { number: 8888, service: "Jupyter Lab" },
      { number: 6006, service: "TensorBoard" }
    ],
    user: "usuario1@example.com",
  },
  {
    id: "pod-4",
    name: "ComfyUI-2",
    status: "stopped",
    uptime: "-",
    cpu: 0,
    memory: "0GB / 4GB",
    gpu: 0,
    ports: [
      { number: 7860, service: "ComfyUI" }
    ],
    user: "usuario2@example.com",
  },
];

// Función para generar un nuevo pod
export const createNewPod = (
  podName: string, 
  template: string, 
  containerDiskSize: number, 
  volumeDiskSize: number,
  selectedGpu: any,
  ports: string,
  user?: string
): LegacyPod => {
  const portsList = ports.split(",").map(port => port.trim()).filter(port => port !== "");
  const portsArray: PodPort[] = [];
  
  portsList.forEach(portStr => {
    const portNum = parseInt(portStr);
    if (!isNaN(portNum)) {
      let service = "Servicio";
      
      // Asignar nombres de servicio basados en puertos conocidos
      switch (portNum) {
        case 8888:
          service = "Jupyter Lab";
          break;
        case 7860:
          service = "ComfyUI";
          break;
        case 6006:
          service = "TensorBoard";
          break;
        case 22:
          service = "SSH";
          break;
        default:
          service = `Puerto ${portNum}`;
      }
      
      // Si el template es específico, personalizar el nombre del servicio
      if (template === "comfyui" && portNum === 7860) {
        service = "ComfyUI";
      }
      
      portsArray.push({ number: portNum, service });
    }
  });
  
  return {
    id: `pod-${Date.now()}`,
    name: podName,
    status: "running",
    uptime: "0h 0m",
    cpu: Math.floor(Math.random() * 20) + 10, // Valor aleatorio entre 10 y 30
    memory: `${(containerDiskSize * 0.3).toFixed(1)}GB / ${containerDiskSize}GB`,
    gpu: Math.floor(Math.random() * 30) + 20, // Valor aleatorio entre 20 y 50
    ports: portsArray,
    ...(user ? { user } : {})
  };
};

// Función para cambiar el estado de un pod
export const togglePodStatus = (pod: LegacyPod): LegacyPod => {
  if (pod.status === "running") {
    // Apagar pod
    toast.success(`Pod ${pod.name} detenido correctamente`);
    return {
      ...pod,
      status: "stopped",
      uptime: "-",
      cpu: 0,
      gpu: 0,
      memory: pod.memory.split('/')[1].trim().replace('GB', '') + "GB / " + pod.memory.split('/')[1].trim()
    };
  } else {
    // Encender pod
    toast.success(`Pod ${pod.name} iniciado correctamente`);
    return {
      ...pod,
      status: "running",
      uptime: "0h 1m",
      cpu: Math.floor(Math.random() * 30) + 10,
      gpu: Math.floor(Math.random() * 50) + 30,
      memory: `${(parseFloat(pod.memory.split('/')[1].trim().replace('GB', '')) * 0.4).toFixed(1)}GB / ${pod.memory.split('/')[1].trim()}`
    };
  }
};

// Función para eliminar un pod
export const deletePod = (podId: string, pods: LegacyPod[]): LegacyPod[] => {
  return pods.filter(pod => pod.id !== podId);
};

// Exportar tipos para compatibilidad hacia atrás
export type Pod = LegacyPod;
export type { PodPort };
