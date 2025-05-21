# 🎯 Especificaciones para Backend

## 📋 Resumen de Cambios Completados

Este documento detalla **todas las correcciones aplicadas** al frontend de NeuroPod y especifica **exactamente qué debe implementar el backend** para que el sistema funcione completamente.

---

## 🔗 Sistema de Conexión de Pods - ESPECIFICACIÓN DETALLADA

### **Generación de URLs:**
```javascript
// Formato: {pod-name}-{user-hash}-{port}.neuropod.online
const subdomain = `${pod-name}-${user-hash}-${port}`;
const url = `https://${subdomain}.neuropod.online`;

function generateSafeHostname(podName, userHash, port) {
  const safePodName = podName.slice(0, 10).toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeUserHash = userHash.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${safePodName}-${safeUserHash}-${port}.neuropod.online`;
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
        "status": "Starting"
      }
    ],
    "tcpServices": [
      {
        "port": 22,
        "serviceName": "SSH",
        "url": "tcp://mi-pod-test-usr123-22.neuropod.online:22",  // No funcional, no pensado en implementar
        "isCustom": false,
        "status": "disable"
      }
    ]
  }
}

```
