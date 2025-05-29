## 🔄 Funcionalidades en Implementación Actual

### Gestión de Pods (`/admin/pods` y `/client/pods`)

#### Funcionalidades a Implementar

- **Listar pods**: 
  - Cliente: ve solo sus pods
  - Admin: ve sus pods o puede buscar pods por correo de usuario
- **Información por pod**:
  - Nombre, estado, GPU elegida, tiempo activo
  - Métricas: CPU, memoria, GPU (si está en ejecución)
- **Acciones**:
  - Iniciar/Detener pod (activar/desactivar en Kubernetes)
  - Eliminar pod
  - Conectar (Modal con servicios disponibles y puertos)
  - Ver logs

#### Funcionalidades a Implementar

- **Correcciones de UI**:
  - Ajustar sección GPU para vista angosta
  - Reorganizar sección de puertos y Jupyter debajo de discos
  - Actualizar limitadores: Container Disk (máx 100 GB), Volume Disk (máx 150 GB)
- **Configuración de despliegue**:
  - Selección de GPU con precios dinámicos desde backend
  - Opciones de despliegue: Template o Imagen Docker
  - Configuración de puertos y Jupyter Notebook
  - Gestión de discos
  - Cálculo dinámico de costos
- **Para admin**: campo para asignar a usuario específico

## 📋 Funcionalidades Pendientes

### Página de Configuración de Admin `/admin/settings`

- Sistema de precios de GPUs y almacenamiento
- Configuración de plantillas (templates)
- Gestión de logs y backups
- Configuración de auto-apagado de pods inactivos

### Gestión de Usuarios `/admin/users`

- Búsqueda y filtros de usuarios
- Asignación de saldo a usuarios
- Suspensión y eliminación de usuarios

### Estadísticas de Cliente `/client/stats`

- Métricas de utilización de recursos
- Gráficos de uso
- Logs del sistema

## 📝 Plan de Trabajo Recomendado

1. **Completar la gestión básica de pods**:
   - Implementar endpoints de backend para listar, iniciar, detener y eliminar pods
   - Conectar frontend con estos endpoints
   - Implementar la creación de pods y la integración con Kubernetes

2. **Implementar el despliegue de pods**:
   - Desarrollar la lógica para validar configuraciones
   - Implementar la verificación de Jupyter
   - Conectar con el sistema de plantillas y precios

3. **Configurar el sistema de ingress y acceso**:
   - Implementar la generación de URLs según entorno
   - Configurar el enrutamiento correcto de los puertos
   - Asegurar el acceso a servicios (HTTP y Jupyter)

4. **Finalizar las páginas de administración**:
   - Implementar la gestión de usuarios
   - Desarrollar la página de configuración y precios
   - Conectar con el sistema de logs

5. **Implementar estadísticas y monitorización**:
   - Desarrollar la recopilación de métricas de pods
   - Implementar la visualización de estadísticas
   - Configurar el sistema de notificaciones