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
2. ✅ **BAJA**: WebSockets para actualizaciones en tiempo real

**Estas páginas son esenciales** para que los usuarios puedan gestionar sus pods después de crearlos desde `/pods/deploy`.