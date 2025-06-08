import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Terminal, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Copy, 
  Download, 
  Search, 
  Key, 
  X,
  Maximize2,
  Minimize2,
  Settings,
  CheckCircle
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pod } from "@/types/pod";
import { usePodUpdates } from "@/hooks/usePodUpdates";

interface PodLogsDialogProps {
  pod: Pod;
  viewLogs: (podId: string) => void;
  logs: string;
}

// 🎨 Función para resaltar logs con sintaxis
const highlightLogs = (text: string): JSX.Element[] => {
  if (!text) return [];
  
  const lines = text.split('\n');
  
  return lines.map((line, index) => {
    let className = "block";
    const content = line;
    
    // 🔑 TOKEN DE JUPYTER - Máxima prioridad
    if (line.includes('Jupyter Lab token:') || line.includes('🔑')) {
      className += " bg-yellow-900/40 border-l-4 border-yellow-400 pl-4 font-bold text-yellow-200";
    }
    // ❌ ERRORES
    else if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed') || line.includes('❌')) {
      className += " text-red-400 font-semibold";
    }
    // ⚠️ WARNINGS
    else if (line.toLowerCase().includes('warning') || line.toLowerCase().includes('warn') || line.includes('⚠️')) {
      className += " text-yellow-400";
    }
    // ✅ SUCCESS
    else if (line.includes('✅') || line.toLowerCase().includes('success') || line.toLowerCase().includes('ready')) {
      className += " text-green-400";
    }
    // 🚀 INICIO DE SERVICIOS
    else if (line.includes('🚀') || line.includes('Starting') || line.includes('Iniciando')) {
      className += " text-blue-400 font-medium";
    }
    // 🔧 INFO TÉCNICA
    else if (line.includes('🔧') || line.includes('[INFO]') || line.includes('INFO:')) {
      className += " text-cyan-400";
    }
    // 🕐 TIMESTAMPS
    else if (line.match(/^\[?\d{1,2}:\d{2}:\d{2}\]?/)) {
      className += " text-gray-400";
    }
    // 📝 DEFAULT
    else {
      className += " text-gray-100";
    }
    
    return (
      <span key={index} className={className}>
        {content}
        {index < lines.length - 1 && '\n'}
      </span>
    );
  });
};

// 🔑 Función para extraer token de Jupyter
const extractJupyterToken = (logs: string): string | null => {
  const tokenPatterns = [
    /🔑 Jupyter Lab token: ([a-f0-9]{48})/i,
    /Jupyter Lab token: ([a-f0-9]{48})/i,
    /token=([a-f0-9]{48})/i,
    /\?token=([a-f0-9]{48})/i,
  ];
  
  for (const pattern of tokenPatterns) {
    const match = logs.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

export const PodLogsDialog: React.FC<PodLogsDialogProps> = ({ pod, viewLogs, logs: fallbackLogs }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayLogs, setDisplayLogs] = useState(fallbackLogs || "");
  const [isMaximized, setIsMaximized] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lineCount, setLineCount] = useState("500");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  
  // 📡 WebSocket para logs en tiempo real
  const { logs: realtimeLogs, connectionStatus, requestLogs } = usePodUpdates(pod.podId);
  
  // 🔑 Extraer token de Jupyter de los logs
  const jupyterToken = extractJupyterToken(displayLogs);
  
  // 📜 Actualizar logs cuando llegan datos por WebSocket
  useEffect(() => {
    if (realtimeLogs) {
      console.log(`📝 Logs en tiempo real recibidos para ${pod.podId}`);
      setDisplayLogs(realtimeLogs);
      
      // Auto-scroll hacia abajo cuando se agregan nuevos logs
      if (autoRefresh) {
        setTimeout(() => {
          logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [realtimeLogs, pod.podId, autoRefresh]);
  
  // 🔄 Usar logs de fallback si no hay logs de WebSocket
  useEffect(() => {
    if (!realtimeLogs && fallbackLogs) {
      setDisplayLogs(fallbackLogs);
    }
  }, [fallbackLogs, realtimeLogs]);

  const handleOpenLogs = () => {
    setIsOpen(true);
    requestLogs();
    viewLogs(pod.podId);
  };

  const handleRefreshLogs = () => {
    console.log(`🔄 Solicitando actualización de logs para ${pod.podId}`);
    requestLogs();
    viewLogs(pod.podId);
  };
  
  // 📋 Copiar logs completos
  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(displayLogs);
      toast.success("Logs copiados al portapapeles");
    } catch (err) {
      toast.error("Error al copiar logs");
    }
  };
  
  // 🔑 Copiar token de Jupyter
  const handleCopyToken = async () => {
    if (!jupyterToken) {
      toast.error("No se encontró token de Jupyter en los logs");
      return;
    }
    
    try {
      await navigator.clipboard.writeText(jupyterToken);
      toast.success("Token de Jupyter copiado al portapapeles");
    } catch (err) {
      toast.error("Error al copiar token");
    }
  };
  
  // 💾 Descargar logs como archivo
  const handleDownloadLogs = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${pod.podName}-logs-${timestamp}.txt`;
    
    const blob = new Blob([displayLogs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Logs descargados como ${filename}`);
  };
  
  // 🔍 Filtrar logs por búsqueda
  const filteredLogs = searchTerm
    ? displayLogs.split('\n').filter(line => 
        line.toLowerCase().includes(searchTerm.toLowerCase())
      ).join('\n')
    : displayLogs;

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
      <DialogContent className={`${isMaximized ? 'max-w-[95vw] h-[95vh]' : 'sm:max-w-[900px] h-[600px]'} flex flex-col`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Terminal className="h-5 w-5" />
                Logs de {pod.podName}
                
                {/* 📡 Indicador de conexión WebSocket */}
                <div className="flex items-center gap-1">
                  {connectionStatus.connected ? (
                    <span title="Logs en tiempo real">
                      <Wifi className="h-4 w-4 text-green-500" />
                    </span>
                  ) : (
                    <span title="Sin conexión en tiempo real">
                      <WifiOff className="h-4 w-4 text-red-500" />
                    </span>
                  )}
                </div>
                
                {/* 🔑 Indicador de token */}
                {jupyterToken && (
                  <div className="flex items-center gap-1 bg-yellow-900/30 px-2 py-1 rounded text-yellow-200 text-xs">
                    <Key className="h-3 w-3" />
                    Token Jupyter Disponible
                  </div>
                )}
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {connectionStatus.connected ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Logs en tiempo real - Actualización automática
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    Registro de actividad del pod
                  </span>
                )}
              </DialogDescription>
            </div>
            
            {/* 🔧 Controles del modal */}
            <div className="flex items-center gap-1 ml-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="h-8 w-8"
                title="Configuración"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsMaximized(!isMaximized)}
                className="h-8 w-8"
                title={isMaximized ? "Restaurar" : "Maximizar"}
              >
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* 🔧 Panel de configuración */}
          {showSettings && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Líneas a mostrar:</label>
                  <Select value={lineCount} onValueChange={setLineCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 líneas</SelectItem>
                      <SelectItem value="500">500 líneas</SelectItem>
                      <SelectItem value="1000">1000 líneas</SelectItem>
                      <SelectItem value="2000">2000 líneas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Auto-scroll:</label>
                  <Button
                    variant={autoRefresh ? "default" : "outline"}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className="w-full"
                  >
                    {autoRefresh ? "Activado" : "Desactivado"}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar en logs:</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 🔑 Panel del token de Jupyter */}
          {jupyterToken && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Token de Jupyter Lab:</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToken}
                  className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar Token
                </Button>
              </div>
              <div className="mt-2 p-2 bg-yellow-100 rounded font-mono text-sm text-yellow-900 break-all">
                {jupyterToken}
              </div>
            </div>
          )}
          
          {/* 🛠️ Barra de herramientas */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefreshLogs}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Actualizar
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCopyLogs}
              className="flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              Copiar Logs
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadLogs}
              className="flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              Descargar
            </Button>
            
            <div className="flex-1"></div>
            
            {/* 📊 Estadísticas */}
            <div className="text-xs text-muted-foreground">
              {filteredLogs.split('\n').length} líneas
              {searchTerm && ` • ${filteredLogs.split('\n').filter(line => line.trim()).length} coincidencias`}
            </div>
          </div>
        </DialogHeader>
        
        {/* 📜 Área de logs */}
        <div className="flex-1 min-h-0 mt-4">
          <div 
            ref={logsContainerRef}
            className="bg-gray-900 rounded-md p-4 h-full text-white font-mono text-sm overflow-auto relative border"
          >
            <div className="whitespace-pre-wrap">
              {filteredLogs ? highlightLogs(filteredLogs) : (
                <span className="text-gray-400 italic">No hay logs disponibles.</span>
              )}
            </div>
            
            {/* 📍 Marcador para auto-scroll */}
            <div ref={logsEndRef} />
            
            {/* 🔄 Indicadores de estado */}
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {connectionStatus.connecting && (
                <div className="text-yellow-400 text-xs bg-yellow-900/30 px-2 py-1 rounded">
                  Conectando...
                </div>
              )}
              
              {connectionStatus.connected && (
                <div className="text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded animate-pulse">
                  • EN VIVO
                </div>
              )}
              
              {searchTerm && (
                <div className="text-blue-400 text-xs bg-blue-900/30 px-2 py-1 rounded">
                  🔍 Filtrado
                </div>
              )}
            </div>
            
            {/* 🎯 Indicador de token encontrado */}
            {jupyterToken && (
              <div className="absolute bottom-2 right-2">
                <div className="text-yellow-400 text-xs bg-yellow-900/30 px-2 py-1 rounded flex items-center gap-1">
                  <Key className="h-3 w-3" />
                  Token detectado
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 📊 Footer con información */}
        <div className="flex-shrink-0 mt-4 text-xs text-muted-foreground text-center border-t pt-2">
          {connectionStatus.connected ? (
            <span className="text-green-600 flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Los logs se actualizan automáticamente
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Usa el botón de actualizar para obtener logs recientes
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
