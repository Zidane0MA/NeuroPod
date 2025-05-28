import React from "react";
import { Button } from "@/components/ui/button";
import { Play, StopCircle, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PodConnectDialog } from "./PodConnectDialog";
import { PodLogsDialog } from "./PodLogsDialog";
import { LegacyPod } from "@/types/pod";

interface PodActionsProps {
  pod: LegacyPod;
  onTogglePod: (podId: string) => void;
  onDeletePod: (podId: string) => void;
  viewLogs: (podName: string) => void;
  logs: string;
}

export const PodActions: React.FC<PodActionsProps> = ({
  pod,
  onTogglePod,
  onDeletePod,
  viewLogs,
  logs
}) => {
  const getToggleButton = () => {
    if (pod.status === "running") {
      return (
        <Button 
          variant="outline" 
          className="flex gap-2 items-center"
          onClick={() => onTogglePod(pod.id)}
        >
          <StopCircle className="h-4 w-4" />
          Detener
        </Button>
      );
    } else if (pod.status === "stopped") {
      return (
        <Button 
          variant="outline" 
          className="flex gap-2 items-center"
          onClick={() => onTogglePod(pod.id)}
        >
          <Play className="h-4 w-4" />
          Iniciar
        </Button>
      );
    } else if (pod.status === "creating") {
      return (
        <Button 
          variant="outline" 
          className="flex gap-2 items-center"
          disabled
        >
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Iniciando...
        </Button>
      );
    } else {
      return (
        <Button 
          variant="outline" 
          className="flex gap-2 items-center"
          disabled
        >
          <StopCircle className="h-4 w-4" />
          Estado desconocido
        </Button>
      );
    }
  };

  return (
    <div className="flex flex-wrap justify-end items-center gap-3">
      {getToggleButton()}
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="flex gap-2 items-center text-red-500 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el pod "{pod.name}" y no se puede deshacer.
              {pod.user && (
                <span className="block mt-2 text-sm">
                  Este pod pertenece al usuario: <strong>{pod.user}</strong>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => onDeletePod(pod.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <PodConnectDialog pod={pod} />
      <PodLogsDialog pod={pod} viewLogs={viewLogs} logs={logs} />
    </div>
  );
};
