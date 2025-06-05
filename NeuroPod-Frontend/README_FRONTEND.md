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
- **Modo Simulación**: Sistema integrado para desarrollo sin backend

## Estructura del Proyecto (Actualizado)

```
.env
package.json
README_FRONTEND.md
vite.config.ts
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
│  │  │  ├─ PodActions.tsx          # Acciones start/stop/delete/connect/logs
│  │  │  ├─ PodCard.tsx             # Card principal del pod con stats
│  │  │  ├─ PodConnectDialog.tsx    # Modal de conexión con servicios HTTP/TCP
│  │  │  ├─ PodLogsDialog.tsx       # Modal de logs del contenedor
│  │  │  ├─ PodsContainer.tsx       # Contenedor de lista de pods
│  │  │  ├─ PodsHeader.tsx
│  │  │  └─ PodStats.tsx            # Estadísticas CPU/memoria/GPU/uptime
│  │  ├─ settings/
│  │  │  ├─ LogsSettings.tsx
│  │  │  ├─ PricingSettings.tsx     # Panel de administración en /admin/settings
│  │  │  ├─ ProfileSettings.tsx
│  │  │  ├─ SettingsTabs.tsx
│  │  │  ├─ SystemSettings.tsx
│  │  └─ users/
│  │     ├─ UserActionDialog.tsx    # Modal para acciones de usuario (asignar saldo, roles)
│  │     ├─ UsersSearch.tsx         # Componente de búsqueda de usuarios
│  │     └─ UsersTable.tsx          # Tabla de usuarios con paginación
│  ├─ client/
│  │  └─ pods/
│  │     ├─ ClientPodsHeader.tsx
│  │     ├─ EmptyPodsList.tsx
│  │     ├─ PodActions.tsx          # Acciones start/stop/delete/connect/logs
│  │     ├─ PodCard.tsx             # Card principal del pod con stats
│  │     ├─ PodConnectDialog.tsx    # Modal de conexión con servicios HTTP/TCP
│  │     ├─ PodLogsDialog.tsx       # Modal de logs del contenedor
│  │     ├─ PodsContainer.tsx       # Contenedor de lista de pods
│  │     └─ PodStats.tsx            # Estadísticas CPU/memoria/GPU/uptime
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
│  │  └─ PricingCards.tsx     # Página pública /pricing con precios dinámicos
│  └─ ui/                     # Componentes UI de shadcn
├─ context/
│  └─ AuthContext.tsx         # Gestión de autenticación
├─ data/mockUsers.ts          # Datos de muestra para desarrollo
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
│  │  ├─ PodDeploy.tsx
│  │  ├─ Pods.tsx             # Gestión completa de pods con búsqueda por usuario
│  │  ├─ Settings.tsx         # Configuraciones del sistema
│  │  ├─ Templates.tsx        # Gestión de plantillas Docker
│  │  └─ Users.tsx            # Gestión de usuarios
│  └─ client/
│     ├─ Help.tsx
│     ├─ PodDeploy.tsx
│     ├─ Pods.tsx             # Gestión de pods del cliente
│     ├─ Settings.tsx
│     └─ Stats.tsx
├─ services/
│  ├─ api.ts                  # Cliente Axios para API
│  ├─ auth.service.ts         # Servicios de autenticación
│  ├─ pod.service.ts          # Servicios de pods con modo simulación
│  ├─ pricing.service.ts      # Servicio de precios para comunicación con API
│  ├─ template.service.ts     # Servicios de templates
│  ├─ user.service.ts         # Servicios de usuarios
│  └─ websocket.service.ts    # Servicios de websocket
├─ types/
│  ├─ pod.ts                  # Tipos modernos de pods + SimulatedPod
│  ├─ templates.ts            # Tipos de templates
│  └─ user.ts                 # Tipos de usuarios
└─ utils/podUtils.ts          # Utilidades para simulación de pods

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
- **/admin/pods** - Visualización y gestión de todos los contenedores + búsqueda por usuario
- **/admin/pods/deploy** - Interfaz para crear nuevos contenedores
- **/admin/templates** - Gestión de plantillas Docker predefinidas
- **/admin/users** - Gestión de usuarios (asignar saldo, roles)
- **/admin/settings** - Configuración de precios y sistema
- **/admin/help** - Documentación para administradores

### Panel de Cliente (requiere rol "client")
- **/client/stats** - Estadísticas de uso, costos y recursos
- **/client/pods** - Visualización y gestión de contenedores propios
- **/client/pods/deploy** - Interfaz para crear nuevos contenedores
- **/client/settings** - Configuración de cuenta y preferencias
- **/client/help** - Documentación para usuarios

## 🚀 Funcionalidades del Frontend

### ✅ Implementadas

#### **Sistema de Autenticación**
- ✅ Google OAuth2 integrado
- ✅ Login simulado para desarrollo
- ✅ Control de acceso basado en roles (admin/client)
- ✅ Gestión de sesiones con JWT

#### **Gestión de Pods Completa**
- ✅ **Listar pods** del usuario actual
- ✅ **Búsqueda por usuario** (solo admins)
- ✅ **Start/Stop/Delete** pods con feedback visual
- ✅ **Modal de conexión** con servicios HTTP/TCP
- ✅ **Logs en tiempo real** del contenedor
- ✅ **Estadísticas** (CPU, memoria, GPU, uptime)

#### **Modo de Simulación Avanzado** 🎭
- ✅ **Pod simulado funcional** sin necesidad de backend
- ✅ **Todas las operaciones** (start, stop, delete, connect, logs)
- ✅ **Indicadores visuales** distintivos para simulación
- ✅ **Estado persistente** durante la sesión
- ✅ **Detección automática** cuando backend no disponible

#### **Sistema de Templates**
- ✅ **CRUD completo** de plantillas Docker
- ✅ **Plantillas predefinidas** (Ubuntu, ComfyUI, Data Science)
- ✅ **Configuración de puertos** HTTP y TCP
- ✅ **Gestión de recursos** (disk, memoria, GPU)

#### **Interfaz de Usuario**
- ✅ **Diseño responsivo** con TailwindCSS
- ✅ **Componentes modernos** con shadcn-ui
- ✅ **Estados visuales claros** (🟢🟡🔴⚪)
- ✅ **Notificaciones** con feedback de acciones
- ✅ **Rutas protegidas** por roles

#### **Sistema de precios**
- ✅ **Servicio de precios** - Comunicación con API
- ✅ **Panel `/admin/settings`** - Configuración visual de precios
- ✅ **Página `/pricing`** - Precios dinámicos públicos
- ✅ **Deploy pages** - Carga precios en tiempo real
- ✅ **Cálculos automáticos** - Costos actualizados

### ⏳ Pendientes de Implementar

#### **Integración Backend**
- ⏳ **WebSockets** para actualizaciones en tiempo real
- ⏳ **Sincronización** de estado con base de datos

#### **Funcionalidades Avanzadas**
- ⏳ **Sistema de saldo** con actualizaciones automáticas
- ⏳ **Métricas en tiempo real** de uso de recursos

#### **Optimizaciones**
- ⏳ **Cache inteligente** de datos de pods
- ⏳ **Lazy loading** de componentes pesados
- ⏳ **Mejores estados de carga** y skeleton screens

## 🔌 Integración con Backend

El frontend está preparado para comunicarse con el backend a través de:

### **1. API REST** (`api.neuropod.online`)
```typescript
// Endpoints de la API REST consumidos desde el frontend
// --- Autenticación ---
POST   /api/auth/google             # Login con Google OAuth2
POST   /api/auth/mock-login         # Login simulado (desarrollo)
GET    /api/auth/verify             # Verificar token y obtener usuario
POST   /api/auth/logout             # Cerrar sesión

// --- Pods ---
GET    /api/pods                    # Listar pods del usuario actual
GET    /api/pods?userEmail=X        # Buscar pods por usuario (admin)
POST   /api/pods                    # Crear nuevo pod
GET    /api/pods/:id/connections    # Obtener servicios/conexiones del pod
GET    /api/pods/:id/logs           # Obtener logs del pod
POST   /api/pods/:id/start          # Iniciar pod
POST   /api/pods/:id/stop           # Detener pod
DELETE /api/pods/:id                # Eliminar pod

// --- Templates ---
GET    /api/templates               # Listar templates
POST   /api/templates               # Crear template
GET    /api/templates/:id           # Detalles de template
PUT    /api/templates/:id           # Actualizar template
DELETE /api/templates/:id           # Eliminar template

// --- Estado del sistema ---
GET    /api/status/public           # Estado público de la API
GET    /api/status                  # Estado detallado (admin)

// --- Usuarios (admin) ---
GET    /api/pricing                 # Obtener precios de recursos
GET    /api/pricing/public          # Obtener precios de recursos (publico)
POST   /api/pricing/calculate-cost  # Calcular costos según los recursos solicitados
GET    /api/pricing/gpus/available  # Listar las GPUs disponibles
GET    /api/pricing/gpus/:gpuId     # Obtener información de una GPU
PUT    /api/pricing                 # Actualizar la configuración de precios (admin)
POST   /api/pricing/reset           # Restablecer valores de los precios (admin)

// --- Usuarios (admin) ---
GET    /api/auth/users              # Listar todos los usuarios (admin)
POST   /api/auth/users/balance      # Actualizar saldo de un usuario (admin)
POST   /api/auth/users/suspend      # Suspender un usuario (admin)
DELETE /api/auth/users/:userId      # Eliminar un usuario (admin)
POST   /api/auth/users/fix-balances # Corregir balances de administradores (admin)
```

### **2. WebSockets** (estado actual)
```typescript
// Eventos preparados para integración
'podUpdate'     # Recibe actualizaciones de estado y métricas del pod (unificado)
```

### **3. Modo de Simulación** 🎭
```typescript
// Detección automática
if (backend_unavailable) {
  return getSimulatedPods(user); // Modo simulacion
} else {
  return await api.get('/api/pods'); // Backend real
}
```

## 🛠️ Desarrollo Local

### Requisitos
- Node.js v22 o superior
- npm

### Configuración
1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/Zidane0MA/NeuroPod.git
   cd NeuroPod-Frontend
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Configura variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido o usando el archivo `.env.example` como base:
   
   ```bash
   # Crea .env.local
   VITE_API_URL=http://localhost:3000
   VITE_API_URL_HTTPS=https://api.neuropod.online
   VITE_GOOGLE_CLIENT_ID=tu-google-client-id
   ```

4. **Inicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

5. **Accede a la aplicación:** `http://localhost:5173`

### 🎭 Modo de Simulación

El frontend incluye un sistema de simulación completo que permite:

- **Desarrollo sin backend**: Todas las funcionalidades disponibles
- **Login simulado**: Usa cualquier email (use `lolerodiez@gmail.com` para admin)
- **Pod de demostración**: "ComfyUI-Demo" completamente funcional
- **Operaciones completas**: Start, stop, delete, connect, logs

**Ver documentación completa:** `../Documentacion/MODO_SIMULACION_PODS.md`

## 📊 Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `VITE_API_URL` | URL del backend | `http://localhost:3000` |
| `VITE_API_URL_HTTPS` | URL del backend (HTTPS) | `https://api.neuropod.online` |
| `VITE_GOOGLE_CLIENT_ID` | ID de cliente OAuth2 | - |

## 🚨 Notas Importantes

### **Desarrollo**
- **Modo simulación automático** cuando backend no disponible
- **Datos consistentes** entre reinicios durante la sesión
- **Todas las funcionalidades** disponibles sin dependencias

### **Producción**
- **Backend requerido** para funcionalidad completa
- **WebSockets necesarios** para actualizaciones en tiempo real
- **Cloudflare Tunnel** configurado para subdominios dinámicos

### **Compatibilidad**
- **Progressive Enhancement**: Funciona sin backend, mejor con backend
- **Fallback inteligente**: Simulación cuando hay errores de conexión
- **Tipos estrictos**: TypeScript previene errores de integración

## 🎯 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run build            # Build para producción
npm run preview          # Preview del build
npm run type-check       # Verificar tipos TypeScript

# Testing del modo simulación
# 1. npm run dev
# 2. Abrir http://localhost:5173
# 3. Login con cualquier email
# 4. Ir a /admin/pods o /client/pods
# 5. Probar todas las funcionalidades
```

## 📞 Soporte

- **Documentación técnica**: Archivos `*.md` en el directorio
- **Modo simulación**: `../Documentacion/MODO_SIMULACION_PODS.md`
- **Issues**: Repositorio del proyecto
- **Contacto**: lolerodiez@gmail.com

---

**El frontend de NeuroPod está diseñado para proporcionar una experiencia completa de gestión de contenedores, con capacidades avanzadas de simulación para desarrollo y demostración, listo para integración con el backend de producción.**
