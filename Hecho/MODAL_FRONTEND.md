# 🔗 NeuroPod - Modal de Conexión FINAL

## 🎨 **Diseño Visual del Modal**

### **Estructura del Modal:**
```
┌─ Conectar a: {nombre-pod} ───────────────────────────────────┐
│                                                              │
│  📡 HTTP Services:                                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Jupyter Lab                                      🟢    │ │
│  │ → :8888                                  [🔗 Abrir]    │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Web Server                                       🟡    │ │
│  │ → :3000                                  [🔗 Abrir]    │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Servicio 3                                       🟢    │ │
│  │ → :7860                                  [🔗 Abrir]    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  🔌 TCP Services:                                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ SSH                                              ⚪    │ │
│  │ → :22                                    [🔗 Abrir]    │ │ (decorativo)
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│                                           [Cerrar]           │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 **Estados de Indicadores de Conexión**

### **Estados Visuales:**
- 🟢 **Verde**: Servicio listo y disponible
- 🟡 **Amarillo**: Servicio iniciando/no disponible
- 🔴 **Rojo**: Servicio con error o detenido
- ⚪ **Gris**: Servicio decorativo (TCP)

### **Estados del Pod y Comportamiento:**

#### **Pod Running (🟢):**
```
┌─ Conectar a: {nombre-pod} ───────────────────────────────────┐
│                                                              │
│  📡 HTTP Services:                                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Jupyter Lab                                      🟢    │ │
│  │ → :8888                                  [🔗 Abrir]    │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Web Server                                       🟢    │ │
│  │ → :3000                                  [🔗 Abrir]    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  🔌 TCP Services:                                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ SSH                                              ⚪    │ │
│  │ → :22                                    [🔗 Abrir]    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│                                           [Cerrar]           │
└──────────────────────────────────────────────────────────────┘
```

#### **Pod Starting (🟡):**
```
┌─ Conectar a: {nombre-pod} ───────────────────────────────────┐
│                                                              │
│  ⏳ El pod se está iniciando...                              │
│                                                              │
│  📡 HTTP Services:                                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Jupyter Lab                                       🟡   │ │
│  │ → :8888                                   [🔗 Abrir]   │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Web Server                                        🟡   │ │
│  │ → :3000                                   [🔗 Abrir]   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│                                           [Cerrar]           │
└──────────────────────────────────────────────────────────────┘
```

#### **Pod Stopped (🔴):**
```
┌─ Conectar a: mi-pod-test ────────────────────────────────────┐
│                                                              │
│  🛑 El pod está detenido                                    │
│                                                              │
│  Para acceder a los servicios, inicia el pod desde           │
│  el botón "Iniciar" en la tabla de pods.                     │
│                                                              │
│                                           [Cerrar]           │
└──────────────────────────────────────────────────────────────┘
```

---

## 💻 **Implementación Frontend React**

```jsx
// src/components/modals/ConnectionModal.jsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Wifi, WifiOff, Loader2 } from 'lucide-react';
import axios from 'axios';

const ConnectionModal = ({ podId, isOpen, onClose }) => {
  const [connections, setConnections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && podId) {
      fetchConnections();
    }
  }, [isOpen, podId]);

  const fetchConnections = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/pods/${podId}/connections`);
      setConnections(response.data.data);
    } catch (error) {
      console.error('Error fetching connections:', error);
      setError('No se pudieron cargar las conexiones. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const openService = (url, isAvailable) => {
    if (isAvailable) {
      window.open(url, '_blank');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready': return '🟢';
      case 'starting': return '🟡';
      case 'error': return '🔴';
      case 'stopped': return '🔴';
      default: return '⚪';
    }
  };

  const isServiceAvailable = (status) => status === 'ready';

  const renderServiceCard = (service, index, isTcp = false) => (
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
  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Conectar a: {connections?.podName || 'Pod'}
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
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  📡 HTTP Services:
                </h4>
                <div className="space-y-2">
                  {connections?.httpServices?.map((service, index) =>
                    renderServiceCard({...service, status: 'starting'}, index, false)
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* HTTP Services */}
              {connections?.httpServices?.length > 0 && (
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
              {connections?.tcpServices?.length > 0 && (
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
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionModal;
```

---

## 📊 **API Response Esperada**

### **GET /api/pods/:id/connections**

#### **Pod Running:**
```javascript
{
  "success": true,
  "data": {
    "podId": "pod_uuid_1",
    "podName": "mi-pod-test",
    "status": "running",
    "httpServices": [
      {
        "port": 8888,
        "serviceName": "Jupyter Lab",
        "url": "https://mi-pod-test-usr123-8888.neuropod.online",
        "isCustom": false,
        "status": "ready"
      },
      {
        "port": 3000,
        "serviceName": "Web Server",
        "url": "https://mi-pod-test-usr123-3000.neuropod.online",
        "isCustom": false,
        "status": "ready"
      },
      {
        "port": 7860,
        "serviceName": "Servicio 3",
        "url": "https://mi-pod-test-usr123-7860.neuropod.online",
        "isCustom": true,
        "status": "ready"
      }
    ],
    "tcpServices": [
      {
        "port": 22,
        "serviceName": "SSH",
        "url": "tcp://mi-pod-test-usr123-22.neuropod.online:22",
        "isCustom": false,
        "status": "ready"
      }
    ]
  }
}
```

#### **Pod Stopped:**
```javascript
{
  "success": true,
  "data": {
    "podId": "pod_uuid_1",
    "podName": "mi-pod-test",
    "status": "stopped",
    "message": "El pod está detenido",
    "httpServices": [],
    "tcpServices": []
  }
}
```

#### **Pod Starting:**
```javascript
{
  "success": true,
  "data": {
    "podId": "pod_uuid_1",
    "podName": "mi-pod-test",
    "status": "starting",
    "httpServices": [
      {
        "port": 8888,
        "serviceName": "Jupyter Lab",
        "url": "https://mi-pod-test-usr123-8888.neuropod.online",
        "isCustom": false,
        "status": "starting"
      },
      {
        "port": 3000,
        "serviceName": "Web Server",
        "url": "https://mi-pod-test-usr123-3000.neuropod.online",
        "isCustom": false,
        "status": "starting"
      }
    ],
    "tcpServices": []
  }
}
```

---

## 🎯 **Características Principales**

### ✅ **Estados Visuales Claros:**
- 🟢 Servicio listo para usar
- 🟡 Servicio iniciando
- 🔴 Servicio con error
- ⚪ Servicio decorativo (TCP)

### ✅ **Comportamiento por Estado:**
- **Running**: Todos los servicios disponibles
- **Starting**: Servicios en iniciando con indicador visual
- **Stopped**: Mensaje explicativo sin servicios

### ✅ **Interacción Intuitiva:**
- Botones deshabilitados para servicios no disponibles
- Click para abrir servicios en nueva pestaña
- TCP services decorativos (no funcionales)

### ✅ **Responsive y Accesible:**
- Modal responsive con max-width
- Iconos claros para mejor UX
- Estados de carga y error manejados

Este modal proporciona una **experiencia de usuario clara y profesional** para conectarse a los diferentes servicios de los pods de NeuroPod.