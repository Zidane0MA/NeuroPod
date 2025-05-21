# 🎯 Especificaciones para el frontend

## 📋 Resumen de Cambios Completados

Este documento detalla **todas las correcciones aplicadas** al frontend de NeuroPod y especifica **exactamente qué debe enviar el backend** para que el sistema funcione completamente.

---

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
1. ✅ **ALTA**: Desarrollar las páginas `/admin/pods` y `/client/pods` con tabla de pods
2. ✅ **ALTA**: Implementar modal de "Conectar" con servicios disponibles  
3. ✅ **ALTA**: Implementar acciones (iniciar, detener, eliminar)
4. ✅ **MEDIA**: Modal de logs del pod
5. ✅ **BAJA**: WebSockets para actualizaciones en tiempo real

**Estas páginas son esenciales** para que los usuarios puedan gestionar sus pods después de crearlos desde `/pods/deploy`.

---

## 🔗 Sistema de Conexión de Pods - ESPECIFICACIÓN DETALLADA

### **Modal "Conectar" - Casos y Comportamiento**

Cuando un usuario hace clic en "Conectar" en la lista de pods, debe abrirse un modal que muestre **todos los servicios disponibles** con sus respectivos enlaces, revisar connection_modal_final.md para tener contexto del modal.

#### **Endpoint para Obtener Información de Conexión:**
```javascript
// revisar casos GET /api/pods/:id/connections en connection_modal_final.md


```