import React from "react";
import { Progress } from "@/components/ui/progress";
import { LegacyPod } from "@/types/pod";

interface PodStatsProps {
  pod: LegacyPod;
}

export const PodStats: React.FC<PodStatsProps> = ({ pod }) => {
  const getMemoryProgress = () => {
    if (pod.status !== "running" || !pod.memory) return 0;
    
    try {
      const [used, total] = pod.memory.split(' / ').map(m => parseFloat(m.replace('GB', '')));
      return (used / total) * 100;
    } catch {
      return 0;
    }
  };

  return (
    <>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Tiempo Activo</span>
          <span>{pod.uptime}</span>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>CPU</span>
          <span>{pod.status === "running" ? `${pod.cpu}%` : "No disponible"}</span>
        </div>
        {pod.status === "running" && (
          <Progress value={pod.cpu} className="h-2" />
        )}
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Memoria</span>
          <span>{pod.status === "running" ? pod.memory : "No disponible"}</span>
        </div>
        {pod.status === "running" && (
          <Progress value={getMemoryProgress()} className="h-2" />
        )}
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>GPU</span>
          <span>{pod.status === "running" ? `${pod.gpu}%` : "No disponible"}</span>
        </div>
        {pod.status === "running" && (
          <Progress value={pod.gpu} className="h-2" />
        )}
      </div>
    </>
  );
};
