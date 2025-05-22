# 🎯 Especificaciones para el frontend

## 📈 Páginas de Pods (/admin/pods y /client/pods) - **PENDIENTES DESARROLLO**

### **Funcionalidades Faltantes en el Frontend**

Estas páginas necesitan ser desarrolladas completamente para mostrar la lista de pods con sus respectivas funcionalidades:

#### **Diseño de la Tabla de Pods:**
```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Nombre     │ Estado       │ GPU         │ Tiempo Activo │ Discos Size    │ CPU   │ Memoria │ GPU   │ Acciones            │
├────────────┼──────────────┼─────────────┼───────────────┼────────────────┼───────┼─────────┼───────┼─────────────────────┤
│ mi-pod     │ 🟢 Running  │ -RTX 4050   │ 2h 15m        │ [ContainerDisk]│ 45%   │ 1.2GB   │ 65%   │ [Detener / Iniciar] │
│            │ 🔴 Stopped  │ -RTX 4080   │               │ [VolumeDisk]   │       │         │       │ [Conectar][Eliminar]│
│            │ 🟡 Starting │ -RTX 4090   │               │                │       │         │       │ [Logs]              │
└────────────┴──────────────┴─────────────┴───────────────┴────────────────┴───────┴─────────┴───────┴─────────────────────┘
```

### **Prioridad de Desarrollo para Frontend:**
1. ✅ **ALTA**: Modificar las páginas `/admin/pods` y `/client/pods` con tabla de pods
2. ✅ **ALTA**: Implementar modal de "Conectar" con servicios disponibles  
3. ✅ **ALTA**: Implementar acciones (iniciar, detener, eliminar)
4. ✅ **MEDIA**: Modal de logs del pod
5. ✅ **BAJA**: WebSockets para actualizaciones en tiempo real

**Estas páginas son esenciales** para que los usuarios puedan gestionar sus pods después de crearlos desde `/pods/deploy`.

---

#### **Métricas a Recopilar:**
```javascript
// Para mostrar en el frontend
{
  "podId": "pod_uuid_1",
  "status": "running",
  "containerDiskSize": "10",
  "volumeDiskSize": "20",
  "activeTime": "2h 45m",
  "cpu": "45%",
  "memory": "1.2GB / 2GB",
  "gpu": "65%"
  "logs": "...."
}
```

### **Endpoint para Obtener Información de Conexión:**
```javascript
// GET /api/pods/:id/connections
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