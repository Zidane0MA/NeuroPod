# Cambios Pendientes para Implementar en NeuroPod

Este documento recoge los cambios necesarios para completar la implementación de la plataforma NeuroPod, tanto para el backend como para el frontend.

## Backend

### 1. Integración con Kubernetes

- [ ] Implementar controlador para crear, modificar y eliminar pods
- [ ] Implementar controlador para crear volúmenes persistentes (PVC)
- [ ] Implementar controlador para gestionar ingress rules y servicios
- [ ] Integrar biblioteca @kubernetes/client-node
- [ ] Agregar lógica para monitorear el estado de los pods
- [ ] Agregar sistema para generar subdominios únicos
- [ ] Implementar gestión de recursos (CPU, memoria)

### 2. Implementación de WebSockets

- [ ] Completar la implementación de socket.io para comunicación en tiempo real
- [ ] Agregar eventos para notificaciones de cambios en pods
- [ ] Implementar canales por usuario para información privada
- [ ] Agregar eventos para métricas en tiempo real

### 3. Modelos y APIs Pendientes

- [ ] Modelo y controlador para plantillas de contenedores
- [ ] Modelo y controlador para precios de recursos
- [ ] Ampliar modelo de usuario con información de uso
- [ ] Sistema de transacciones para el saldo
- [ ] Implementar registro completo de actividades

### 4. Autenticación y Seguridad

- [x] Implementar autenticación con Google OAuth2
- [x] Sistema de roles (admin/client) basado en correo electrónico
- [x] Opción de confiar en verificación de Google en producción
- [x] Implementar cierre de sesión seguro (eliminación de token en el backend)
- [x] Manejo adecuado de errores durante el cierre de sesión
- [ ] Opción de cerrar todas las sesiones activas
- [ ] Logs de actividad detallados para inicio/cierre de sesión
- [ ] Panel de administración de usuarios

### 5. Seguridad y Rendimiento

- [ ] Agregar rate limiting para prevenir abusos
- [ ] Implementar validación de entrada en todos los endpoints
- [ ] Configurar políticas de CORS más estrictas para producción
- [ ] Agregar compresión para respuestas API
- [ ] Configurar caché para endpoints estáticos

## Frontend

### 1. Conexión con Backend

- [ ] Implementar servicio para gestión de pods (pod.service.ts)
- [ ] Implementar servicio para gestión de usuarios (user.service.ts)
- [ ] Implementar servicio para estadísticas (stats.service.ts)
- [x] Completar implementación de la autenticación con Google OAuth
- [x] Implementar funcionalidad de logout con feedback visual
- [ ] Agregar manejo de errores globales

### 2. Componentes y Páginas

- [ ] Completar página de estadísticas del cliente
- [ ] Implementar gestión de usuarios para administradores
- [ ] Implementar gestión de plantillas para administradores
- [ ] Implementar configuración de precios
- [ ] Implementar visualización de logs
- [ ] Integrar formulario para creación de pods

### 3. Funcionalidades Interactivas

- [ ] Agregar WebSocket para actualizaciones en tiempo real
- [ ] Implementar indicadores de estado para los pods
- [ ] Agregar gráficos de uso de recursos
- [ ] Implementar notificaciones para eventos importantes
- [ ] Agregar soporte para temas oscuro/claro

### 4. Mejoras de Experiencia de Usuario

- [ ] Optimizar para dispositivos móviles
- [ ] Agregar feedback de carga para operaciones largas
- [ ] Implementar tutoriales interactivos
- [ ] Añadir documentación integrada
- [ ] Mejorar accesibilidad (a11y)

## Infraestructura

### 1. Despliegue

- [ ] Configurar pipeline CI/CD
- [ ] Preparar Docker Compose para desarrollo
- [ ] Configurar Kubernetes para producción
- [ ] Configurar backup automático de MongoDB
- [ ] Implementar monitoreo (Prometheus/Grafana)

### 2. Dominios y SSL

- [ ] Configurar Cloudflare Tunnel correctamente
- [ ] Configurar DNS wildcard para subdominios
- [ ] Asegurar que todos los subdominios usan HTTPS
- [ ] Configurar redirecciones apropiadas

### 3. Seguridad

- [ ] Implementar firewall y reglas de seguridad
- [ ] Configurar aislamiento de red para contenedores
- [ ] Implementar política de contraseñas
- [ ] Configurar auditoría de seguridad automática

## Notas Importantes

1. **Prioridades**: Centrarse primero en la funcionalidad básica de crear y gestionar pods
2. **Enfoque incremental**: Implementar funcionalidades una por una y probarlas antes de continuar
3. **Compatibilidad**: Asegurar que todo funciona correctamente en Windows, Linux y MacOS
4. **Simulación**: Usar el modo de simulación para desarrollo cuando sea necesario