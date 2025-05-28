# NeuroPod - Frontend

## Descripción del Frontend

El frontend de NeuroPod es una aplicación web desarrollada en React que proporciona una interfaz intuitiva para gestionar contenedores Docker personalizados. Permite a los usuarios autenticarse, crear y gestionar sus propios contenedores, y acceder a ellos a través de subdominios personalizados.

## Tecnologías Utilizadas

- **Framework**: React
- **Bundler**: Vite
- **Lenguaje**: TypeScript
- **Estilos**: TailwindCSS
- **Componentes UI**: shadcn-ui
- **Autenticación**: Google OAuth2 con JWT
- **Comunicación en tiempo real**: WebSockets

## Estructura del Proyecto (Actualizado)

```
src/
├─ App.css
├─ App.tsx                    # Rutas que se manejan
├─ index.css
├─ main.tsx                   # Punto de entrada de la aplicación
├─ vite-env.d.ts              # Tipos de Vite
├─ components/
│  ├─ ProtectedRoute.tsx
│  ├─ admin/
│  │  ├─ pods/
│  │  │  ├─ EmptyPodsList.tsx
│  │  │  ├─ PodActions.tsx
│  │  │  ├─ PodCard.tsx
│  │  │  ├─ PodConnectDialog.tsx
│  │  │  ├─ PodLogsDialog.tsx
│  │  │  ├─ PodsContainer.tsx
│  │  │  ├─ PodsHeader.tsx
│  │  │  └─ PodStats.tsx
│  │  ├─ settings/
│  │  │  ├─ LogsSettings.tsx
│  │  │  ├─ PricingSettings.tsx
│  │  │  ├─ ProfileSettings.tsx
│  │  │  ├─ SettingsTabs.tsx
│  │  │  ├─ SystemSettings.tsx
│  │  └─ users/
│  │     ├─ UserActionDialog.tsx
│  │     ├─ UserDetailDialog.tsx
│  │     ├─ UsersSearch.tsx
│  │     └─ UsersTable.tsx
│  ├─ client/
│  │  └─ pods/
│  │     ├─ ClientPodsHeader.tsx
│  │     ├─ EmptyPodsList.tsx
│  │     ├─ PodActions.tsx
│  │     ├─ PodCard.tsx
│  │     ├─ PodConnectDialog.tsx
│  │     ├─ PodLogsDialog.tsx
│  │     ├─ PodsContainer.tsx
│  │     └─ PodStats.tsx
│  ├─ dashboard/
│  │  ├─ DashboardLayout.tsx
│  │  ├─ DashboardNav.tsx
│  │  └─ InstanceCard.tsx
│  ├─ home/
│  │  ├─ Features.tsx
│  │  ├─ Footer.tsx
│  │  ├─ Hero.tsx
│  │  └─ Navbar.tsx
│  ├─ pricing/
│  │  └─ PricingCards.tsx
│  └─ ui/                     # Componentes UI de shadcn
├─ context/
│  └─ AuthContext.tsx         # Gestión de autenticación
├─ data/mockUsers.ts          # Datos de muestra para desarrollo (Pensado a eliminar)
├─ hooks/
│  ├─ use-mobile.tsx          # Hook para detectar dispositivos móviles
│  └─ use-toast.ts            # Hook para notificaciones
├─ lib/utils.ts               # Utilidades generales
├─ pages/
│  ├─ Dashboard.tsx           # Dashboard principal
│  ├─ Index.tsx               # Página de inicio
│  ├─ Login.tsx               # Inicio de sesión
│  ├─ NotFound.tsx            # Página 404
│  ├─ Pricing.tsx             # Planes y precios
│  ├─ Signup.tsx              # Registro de usuarios
│  ├─ admin/                  # Páginas de administrador
│  │  ├─ Help.tsx
│  │  ├─ PodDeploy.tsx        # Falta poder abrir el modal de informacion del template
│  │  ├─ Pods.tsx             # Falta cambiar el diseño de card de los pods
│  │  ├─ Settings.tsx         # Falta implementar en backend las configuraciones desde aqui
│  │  ├─ Templates.tsx        # Pagina Completa y funcional, falta mejorar el diseño
│  │  └─ Users.tsx            # Pagina que falta trabajar
│  └─ client/                 # Páginas de cliente
│     ├─ Help.tsx
│     ├─ PodDeploy.tsx
│     ├─ Pods.tsx
│     ├─ Settings.tsx
│     └─ Stats.tsx
├─ services/
│  ├─ api.ts                  # Cliente Axios para API
│  ├─ auth.service.ts         # Servicios de autenticación
│  ├─ pod.service.ts          # Servicios de pods (Pensado en eliminar la seccion legacy de todo el proyecto)
│  ├─ template.service.ts     # Servicios de templates
│  └─ websocket.service.ts    # Servicios de websocket
├─ types/
│  ├─ pod.ts                  # Tipos de datos de pods
│  ├─ templates.ts            # Tipos de datos de templates (completo)
│  └─ user.ts                 # Tipos de datos de usuario
└─ utils/podUtils.ts          # Utilidades para pods (Convertir legacyPod a actual, eliminar rastros de legacypod)

```

## Rutas del Frontend

### Páginas Públicas
- **/** - Página de inicio con información sobre NeuroPod
- **/login** - Autenticación con email/contraseña o Google OAuth
- **/signup** - Registro de nuevos usuarios
- **/pricing** - Planes y precios disponibles

### Rutas Protegidas
- **/dashboard** - Panel principal con redirección según rol del usuario

### Panel de Administrador (requiere rol "admin")
- **/admin/pods** - Visualización y gestión de todos los contenedores del sistema
- **/admin/pods/deploy** - Interfaz para crear nuevos contenedores (propios o para usuarios)
- **/admin/Templates** - Interfaz para establecer plantillas que se usaran en `/pods/deploy`
- **/admin/users** - Gestión de usuarios (asignar saldo, suspender cuentas)
- **/admin/settings** - Configuración de precios, sistema y etc
- **/admin/help** - Documentación para administradores

### Panel de Cliente (requiere rol "client")
- **/client/stats** - Estadísticas de uso, costos y recursos
- **/client/pods** - Visualización y gestión de contenedores propios
- **/client/pods/deploy** - Interfaz para crear nuevos contenedores
- **/client/settings** - Configuración de cuenta y preferencias
- **/client/help** - Documentación para usuarios

## Funcionalidades del Frontend

### Implementadas
- ✅ Estructura básica de rutas y navegación
- ✅ Diseño UI con TailwindCSS y shadcn-ui
- ✅ Componente de ruta protegida con control de acceso basado en roles
- ✅ Autenticación básica con login simulado
- ✅ Redirección basada en roles (admin/client)
- ✅ Todas la paginas necesarias creadas
- ✅ Sistema de plantillas creado
- ✅ Envio correcto del formulario de /pods/deploy

### Pendientes de Implementar
- ⏳ **Contexto de Saldo**: 
  - Mostrar saldo infinito para admin (incono) en su respectiva barra lateral 
  - Mostrar saldo real para clientes (10€ iniciales)
  - Actualización en tiempo real al usar contenedores

- ⏳ **Gestión de Pods**:
  - Remodelar el diseño de card de los pods
  - Controles para iniciar/detener/eliminar pods que realicen su respectiva accion
  - Modal de conexión con servicios y puertos disponibles no abre
  - Visualización de logs del contenedor

- ⏳ **Estadísticas**:
  - Gráficos de uso de recursos
  - Historial de costos
  - Logs de actividad

- ⏳ **Panel de Administración**:
  - Gestión de usuarios (asignar saldo, suspender)
  - Configuración de precios para distintos tipos de recursos
  - Gestión de plantillas de contenedores

## Integración con Backend

El frontend se comunica con el backend a través de:

1. **API REST** (`api.neuropod.online`):
   - Endpoints de autenticación: `/api/auth/login`, `/api/auth/verify`
   - Gestión de pods: `/api/pods/start`, `/api/pods/stop`
   - Administración: `/api/admin/users`, `/api/admin/settings`

2. **WebSockets** (pendiente terminar de implementar):
   - Actualizaciones en tiempo real del estado de los pods
   - Notificaciones de eventos del sistema
   - Actualización de saldo al consumir recursos

## Desarrollo Local

### Requisitos
- Node.js v16 o superior
- npm

### Configuración
1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/neuropod-frontend.git
   cd neuropod-frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env.local` con las siguientes variables:
   ```
   VITE_API_URL=http://localhost:3000
   VITE_GOOGLE_CLIENT_ID=tu-google-client-id
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

5. Accede a la aplicación en `http://localhost:5173`

## Notas Importantes

- El frontend incluye un modo de simulación para desarrollo que permite iniciar sesión sin un backend real.
- Para usar el modo de login simulado, ingresa cualquier correo electrónico (usa `lolerodiez@gmail.com` para rol de administrador).
- Para la integración completa, asegúrate de que el backend esté en ejecución en `http://localhost:3000`.
- El sistema está diseñado para trabajar con Cloudflare Tunnel y Kubernetes en producción.

## Variables de Entorno

| Variable                | Descripción                          | Valor por defecto          |
|-------------------------|--------------------------------------|----------------------------|
| VITE_API_URL            | URL del backend                      | http://localhost:3000      |
| VITE_GOOGLE_CLIENT_ID   | ID de cliente para Google OAuth2     | -                          |

## Contacto
Para más información sobre el desarrollo del frontend, contacta a lolerodiez@gmail.com
