import React from "react";
import { Progress } from "@/components/ui/progress";
import { Pod } from "@/types/pod";

interface PodStatsProps {
  pod: Pod;
}

export const PodStats: React.FC<PodStatsProps> = ({ pod }) => {
  const getMemoryProgress = () => {
    if (pod.status !== "running") return 0;
    return pod.stats.memoryUsage;
  };

  const formatUptime = () => {
    if (pod.status !== 'running') return '-';
    
    const uptimeHours = Math.floor(pod.stats.uptime / 3600);
    const uptimeMinutes = Math.floor((pod.stats.uptime % 3600) / 60);
    return `${uptimeHours}h ${uptimeMinutes}m`;
  };

  const formatMemory = () => {
    if (pod.status === 'running') {
      const usedGB = (pod.containerDiskSize * pod.stats.memoryUsage / 100).toFixed(1);
      return `${usedGB}GB / ${pod.containerDiskSize}GB`;
    }
    return `0GB / ${pod.containerDiskSize}GB`;
  };

  return (
    <>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Tiempo Activo</span>
          <span>{formatUptime()}</span>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>CPU</span>
          <span>{pod.status === "running" ? `${pod.stats.cpuUsage}%` : "No disponible"}</span>
        </div>
        {pod.status === "running" && (
          <Progress value={pod.stats.cpuUsage} className="h-2" />
        )}
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Memoria</span>
          <span>{pod.status === "running" ? formatMemory() : "No disponible"}</span>
        </div>
        {pod.status === "running" && (
          <Progress value={getMemoryProgress()} className="h-2" />
        )}
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>GPU</span>
          <span>{pod.status === "running" ? `${pod.stats.gpuUsage}%` : "No disponible"}</span>
        </div>
        {pod.status === "running" && (
          <Progress value={pod.stats.gpuUsage} className="h-2" />
        )}
      </div>
    </>
  );
};
