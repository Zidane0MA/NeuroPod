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
    "createdAt": "2025-01-20T10:30:00Z",

    // ✅ CORREGIDO: Lista completa de servicios por puerto
    "httpServices": [
      {
        "port": 8888,
        "serviceName": "Jupyter Lab",
        "url": "https://mi-pod-test-u8f73a42-8888.neuropod.online",
        "isCustom": false,
        "status": "ready"
      },
      {
        "port": 3000,
        "serviceName": "Web Server",
        "url": "https://mi-pod-test-u8f73a42-3000.neuropod.online",
        "isCustom": false,
        "status": "ready"
      },
      {
        "port": 7860,
        "serviceName": "Servicio 3",
        "url": "https://mi-pod-test-u8f73a42-7860.neuropod.online",
        "isCustom": true,
        "status": "Starting"
      }
    ],
    "tcpServices": [
      {
        "port": 22,
        "serviceName": "SSH",
        "url": "tcp://mi-pod-test-u8f73a42-22.neuropod.online:22",  // No funcional, no pensado en implementar
        "isCustom": false,
        "status": "disable"
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