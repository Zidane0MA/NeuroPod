import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Terminal, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LegacyPod } from "@/types/pod";

interface PodLogsDialogProps {
  pod: LegacyPod;
  viewLogs: (podId: string) => void;
  logs: string;
}

export const PodLogsDialog: React.FC<PodLogsDialogProps> = ({ pod, viewLogs, logs }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenLogs = () => {
    viewLogs(pod.id);
    setIsOpen(true);
  };

  const handleRefreshLogs = () => {
    viewLogs(pod.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex gap-2 items-center"
          onClick={handleOpenLogs}
        >
          <Terminal className="h-4 w-4" />
          Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle>Logs de {pod.name}</DialogTitle>
              <DialogDescription>
                Registro de actividad del pod
              </DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefreshLogs}
              className="h-8 w-8"
              title="Actualizar logs"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="mt-4">
          <div className="bg-black rounded-md p-4 h-[300px] text-white font-mono text-sm overflow-auto whitespace-pre-line">
            {logs || "No hay logs disponibles."}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
