import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Pod, SimulatedPod } from "@/types/pod";
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
  pod: Pod;
}

export const PodConnectDialog: React.FC<PodConnectDialogProps> = ({ pod }) => {
  const [connections, setConnections] = useState<PodConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Verificar si es un pod simulado
  const isSimulated = (pod as SimulatedPod).isSimulated === true;

  const fetchConnections = async () => {
    if (!pod || !pod.podId) return;
    
    // Si es simulado, no hacer llamada API
    if (isSimulated) {
      console.log('Pod simulado detectado, usando información local');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const connectionData = await podService.getPodConnections(pod.podId);
      setConnections(connectionData);
    } catch (err) {
      console.error('Error al obtener conexiones del pod:', err);
      setError('No se pudieron cargar las conexiones. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar apertura del modal
  const handleOpenChange = (open: boolean) => {
    console.log('Modal open state changed:', open);
    setIsOpen(open);
    
    if (open) {
      // Cuando se abre el modal
      if (!isSimulated) {
        console.log('Cargando conexiones para pod real...');
        fetchConnections();
      } else {
        console.log('Usando información local para pod simulado');
      }
    } else {
      // Cuando se cierra el modal
      if (!isSimulated) {
        setConnections(null);
        setError(null);
        setLoading(false);
      }
    }
  };

  const openService = (url: string, isAvailable: boolean) => {
    if (isAvailable) {
      if (isSimulated) {
        // Para pods simulados, mostrar alert en lugar de abrir URL
        alert(`🚀 Simulación: Se abriría ${url}\n\nEn un entorno real, esto abriría el servicio en una nueva pestaña.`);
      } else {
        window.open(url, '_blank');
      }
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
      } ${isSimulated ? 'border-orange-200 bg-orange-50' : ''}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{service.serviceName}</span>
          <span className="text-lg">{getStatusIcon(service.status)}</span>
          {isSimulated && (
            <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
              Simulado
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          → :{service.port}
        </div>
        {isSimulated && (
          <div className="text-xs text-orange-600 mt-1">
            {service.url}
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant={isTcp ? "outline" : "default"}
        onClick={() => openService(service.url, isServiceAvailable(service.status))}
        disabled={isTcp || !isServiceAvailable(service.status)}
        className="ml-3"
      >
        <ExternalLink className="w-4 h-4 mr-1" />
        {isTcp ? 'TCP' : isSimulated ? 'Demo' : 'Abrir'}
      </Button>
    </div>
  );

  // Renderizar contenido del modal
  const renderModalContent = () => {
    console.log('Renderizando contenido del modal, isSimulated:', isSimulated, 'pod status:', pod.status);

    // Para pods simulados, usar directamente la información del pod
    if (isSimulated) {
      return (
        <div className="space-y-6">
          {/* Indicador de simulación */}
          <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-orange-600 text-lg">🎭</span>
              <span className="text-orange-800 font-medium">Modo Simulación</span>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              Este es un pod de demostración. Las conexiones son simuladas para mostrar la funcionalidad.
            </p>
          </div>

          {pod.status === 'stopped' ? (
            <div className="text-center py-6 space-y-3">
              <WifiOff className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium">🛑 El pod está detenido</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Para acceder a los servicios, inicia el pod desde el botón "Iniciar".
                </p>
              </div>
            </div>
          ) : pod.status === 'creating' ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-yellow-500" />
                <p className="text-sm text-muted-foreground mt-2">
                  ⏳ El pod se está iniciando...
                </p>
              </div>
              
              {/* HTTP Services en modo iniciando */}
              {pod.httpServices && pod.httpServices.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    📡 HTTP Services:
                  </h4>
                  <div className="space-y-2">
                    {pod.httpServices.map((service, index) =>
                      renderServiceCard({...service, status: 'creating'}, index, false)
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* HTTP Services */}
              {pod.httpServices && pod.httpServices.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    📡 HTTP Services:
                  </h4>
                  <div className="space-y-2">
                    {pod.httpServices.map((service, index) =>
                      renderServiceCard(service, index, false)
                    )}
                  </div>
                </div>
              )}

              {/* TCP Services */}
              {pod.tcpServices && pod.tcpServices.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    🔌 TCP Services:
                  </h4>
                  <div className="space-y-2">
                    {pod.tcpServices.map((service, index) =>
                      renderServiceCard(service, index, true)
                    )}
                  </div>
                </div>
              )}

              {/* Fallback si no hay servicios */}
              {(!pod.httpServices || pod.httpServices.length === 0) && 
               (!pod.tcpServices || pod.tcpServices.length === 0) && (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No hay servicios disponibles para este pod.</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Para pods reales, usar la lógica existente
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-6">
          <p className="text-red-500">{error}</p>
          <Button 
            onClick={fetchConnections} 
            className="mt-4"
          >
            Reintentar
          </Button>
        </div>
      );
    }

    if (connections?.status === 'stopped') {
      return (
        <div className="text-center py-6 space-y-3">
          <WifiOff className="w-12 h-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-medium">🛑 El pod está detenido</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Para acceder a los servicios, inicia el pod desde el botón "Iniciar" en la tabla de pods.
            </p>
          </div>
        </div>
      );
    }

    if (connections?.status === 'starting' || connections?.status === 'creating') {
      return (
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
      );
    }

    if (connections) {
      return (
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
      );
    }

    // Fallback usando información del pod
    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            📡 HTTP Services:
          </h4>
          <div className="space-y-2">
            {pod.httpServices && pod.httpServices.length > 0 ? (
              pod.httpServices.map((service, index) =>
                renderServiceCard({
                  port: service.port,
                  serviceName: service.serviceName,
                  url: service.url,
                  status: pod.status === 'running' ? 'ready' : 'stopped'
                }, index, false)
              )
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No hay servicios HTTP disponibles
              </div>
            )}
          </div>
        </div>

        {pod.tcpServices && pod.tcpServices.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              🔌 TCP Services:
            </h4>
            <div className="space-y-2">
              {pod.tcpServices.map((service, index) =>
                renderServiceCard({
                  port: service.port,
                  serviceName: service.serviceName,
                  url: service.url,
                  status: service.status
                }, index, true)
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  console.log('Renderizando PodConnectDialog, pod:', pod.podName, 'isSimulated:', isSimulated, 'isOpen:', isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex gap-2 items-center"
        >
          <ExternalLink className="h-4 w-4" />
          Conectar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Conectar a: {connections?.podName || pod.podName}
            {isSimulated && (
              <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full ml-2">
                Simulado
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {renderModalContent()}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
