Todas las funciones de neuropod a implementar:
antes de eso, tengo estas rutas de directorio src en el frontend:
```javascript
    import Index from "./pages/Index";
    import Login from "./pages/Login";
    import Signup from "./pages/Signup";
    import NotFound from "./pages/NotFound";
    import Pricing from "./pages/Pricing";
    import Dashboard from "./pages/Dashboard";
    import AdminPods from "./pages/admin/Pods";
    import AdminUsers from "./pages/admin/Users";
    import AdminSettings from "./pages/admin/Settings";
    import AdminHelp from "./pages/admin/Help";
    import AdminPodDeploy from "./pages/admin/PodDeploy";
    import ClientStats from "./pages/client/Stats";
    import ClientPods from "./pages/client/Pods";
    import ClientSettings from "./pages/client/Settings";
    import ClientHelp from "./pages/client/Help";
    import ClientPodDeploy from "./pages/client/PodDeploy";
    import { AuthProvider } from "./context/AuthContext";
    import ProtectedRoute from "./components/ProtectedRoute";
```
y tengo estas rutas:
```javascript
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    {/* Admin Routes */}
    <Route path="/admin/pods" element={<ProtectedRoute requiredRole="admin"><AdminPods /></ProtectedRoute>} />
    <Route path="/admin/pods/deploy" element={<ProtectedRoute requiredRole="admin"><AdminPodDeploy /></ProtectedRoute>} />
    <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
    <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
    <Route path="/admin/help" element={<ProtectedRoute requiredRole="admin"><AdminHelp /></ProtectedRoute>} />
    {/* Client Routes */}
    <Route path="/client/stats" element={<ProtectedRoute requiredRole="client"><ClientStats /></ProtectedRoute>} />
    <Route path="/client/pods" element={<ProtectedRoute requiredRole="client"><ClientPods /></ProtectedRoute>} />
    <Route path="/client/pods/deploy" element={<ProtectedRoute requiredRole="client"><ClientPodDeploy /></ProtectedRoute>} />
    <Route path="/client/settings" element={<ProtectedRoute requiredRole="client"><ClientSettings /></ProtectedRoute>} />
    <Route path="/client/help" element={<ProtectedRoute requiredRole="client"><ClientHelp /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
```
admin: salario infinito.
usuario: 10 salario.
Funciones a implementar, conexion entre backend y frontend, conexion con kubernetes, cambios a realizar, crear:
1. Estado: falta, ruta: /, que la seccion de documentacion abra "https://github.com/Zidane0MA/NeuroPod"
2. Estado: probar, ruta: /singup, falta probar si se puede registrar.
3. Estado: probar, ruta: /login, falta probar si se puede logear.
  3.1. Cuando me logeo con lolerodiez@gmail.com tengo acceso como admin.  
4. Estado: Hecho, ruta: /pricing, sin cambios. -- No quiero extender mas funcionalidad.
5. Estado: implementar y conectar, ruta: /dashboard, No cambiar Diseño -- Ya muestra el contenido dependiendo del usuario.
  5.1. Implementar para admin: Mostrar cantidad de "Pods totales", "Pods activos", Calcular "CPU promedio" del sistema, Mostrar "Usuarios Activos", "Ganancias".
       Mostrar un graficos del "Rendimiento del sistema", Mostrar los "Logs del Sistema".
  5.2. Sin cambios para los clientes.
6. Estado: Implementar, ruta: /admin/pods, No cambiar Diseño. -- Solo agregar funcionalidades
  6.1. Implementar para usuario (admin y cliente): Se debe listar los pods de cada usuario, cada pod tiene un boton de iniciar/detener (Inicia o detiene un pod ya 
       creado por el usuario en /pods/deploy), eliminar (eliminar un pod creado por el usuario en /pods/deploy), connect y logs.
    6.1.1 Boton connect: Muestra una ventana (ya hecha), en esta ventana listan los servicios arrancados dentro del pod (ya hecho) junto al boton de abrir, que el 
          boton de abrir acceda al puerto correspondiente del pod en estado de ejecucion.












