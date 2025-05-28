import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Wifi, WifiOff, Loader2 } from "lucide-react";
import { LegacyPod } from "@/types/pod";
import { PodConnectionsResponse } from "@/types/pod";
import { podService } from "@/services/pod.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

interface PodConnectDialogProps {
  pod: LegacyPod;
}

export const PodConnectDialog: React.FC<PodConnectDialogProps> = ({ pod }) => {
  const [connections, setConnections] = useState<PodConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchConnections = async () => {
    if (!pod || !pod.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const connectionData = await podService.getPodConnections(pod.id);
      setConnections(connectionData);
    } catch (err) {
      console.error('Error al obtener conexiones del pod:', err);
      setError('No se pudieron cargar las conexiones. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Cuando se abre el diálogo, cargar las conexiones
  const handleOpenDialog = () => {
    setIsOpen(true);
    fetchConnections();
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setConnections(null);
    setError(null);
  };

  const openService = (url: string, isAvailable: boolean) => {
    if (isAvailable) {
      window.open(url, '_blank');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return '🟢';
      case 'starting':
      case 'creating': return '🟡';
      case 'error': return '🔴';
      case 'stopped': return '🔴';
      case 'disable': return '⚪';
      default: return '⚪';
    }
  };

  const isServiceAvailable = (status: string) => status === 'ready';

  const renderServiceCard = (service: any, index: number, isTcp: boolean = false) => (
    <div 
      key={index} 
      className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
        isTcp ? 'bg-gray-50 opacity-60' : 'bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{service.serviceName}</span>
          <span className="text-lg">{getStatusIcon(service.status)}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          → :{service.port}
        </div>
      </div>
      <Button
        size="sm"
        variant={isTcp ? "outline" : "default"}
        onClick={() => openService(service.url, isServiceAvailable(service.status))}
        disabled={isTcp || !isServiceAvailable(service.status)}
        className="ml-3"
      >
        <ExternalLink className="w-4 h-4 mr-1" />
        {isTcp ? 'TCP' : 'Abrir'}
      </Button>
    </div>
  );

  // Si hay error
  if (error && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="flex gap-2 items-center"
            onClick={handleOpenDialog}
          >
            <ExternalLink className="h-4 w-4" />
            Conectar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Error de conexión
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center py-6">
            <p className="text-red-500">{error}</p>
            <Button 
              onClick={fetchConnections} 
              className="mt-4"
            >
              Reintentar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex gap-2 items-center"
          onClick={handleOpenDialog}
        >
          <ExternalLink className="h-4 w-4" />
          Conectar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Conectar a: {connections?.podName || pod.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : connections?.status === 'stopped' ? (
            <div className="text-center py-6 space-y-3">
              <WifiOff className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium">🛑 El pod está detenido</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Para acceder a los servicios, inicia el pod desde el botón "Iniciar" en la tabla de pods.
                </p>
              </div>
            </div>
          ) : connections?.status === 'starting' || connections?.status === 'creating' ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-yellow-500" />
                <p className="text-sm text-muted-foreground mt-2">
                  ⏳ El pod se está iniciando...
                </p>
              </div>
              
              {/* HTTP Services */}
              {connections?.httpServices && connections.httpServices.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    📡 HTTP Services:
                  </h4>
                  <div className="space-y-2">
                    {connections.httpServices.map((service, index) =>
                      renderServiceCard({...service, status: 'starting'}, index, false)
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : connections ? (
            <div className="space-y-6">
              {/* HTTP Services */}
              {connections.httpServices && connections.httpServices.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    📡 HTTP Services:
                  </h4>
                  <div className="space-y-2">
                    {connections.httpServices.map((service, index) =>
                      renderServiceCard(service, index, false)
                    )}
                  </div>
                </div>
              )}

              {/* TCP Services */}
              {connections.tcpServices && connections.tcpServices.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    🔌 TCP Services:
                  </h4>
                  <div className="space-y-2">
                    {connections.tcpServices.map((service, index) =>
                      renderServiceCard(service, index, true)
                    )}
                  </div>
                </div>
              )}

              {/* Fallback si no hay servicios */}
              {(!connections.httpServices || connections.httpServices.length === 0) && 
               (!connections.tcpServices || connections.tcpServices.length === 0) && (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No hay servicios disponibles para este pod.</p>
                </div>
              )}
            </div>
          ) : (
            // Fallback para pods sin conexiones específicas (usar puertos legacy)
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  📡 HTTP Services:
                </h4>
                <div className="space-y-2">
                  {pod.ports.filter(port => port.number !== 22).map((port, index) =>
                    renderServiceCard({
                      port: port.number,
                      serviceName: port.service,
                      url: `https://${pod.name.toLowerCase()}-${pod.id.substring(-6)}-${port.number}.neuropod.online`,
                      status: pod.status === 'running' ? 'ready' : 'stopped'
                    }, index, false)
                  )}
                </div>
              </div>

              {pod.ports.some(port => port.number === 22) && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    🔌 TCP Services:
                  </h4>
                  <div className="space-y-2">
                    {pod.ports.filter(port => port.number === 22).map((port, index) =>
                      renderServiceCard({
                        port: port.number,
                        serviceName: port.service,
                        url: `tcp://${pod.name.toLowerCase()}-${pod.id.substring(-6)}-${port.number}.neuropod.online:${port.number}`,
                        status: 'disable'
                      }, index, true)
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={handleCloseDialog}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
