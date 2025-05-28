# Funcionalidades a Implementar en el Frontend de Neuropod y su conexion con el backend

## Estructura Actual del Proyecto

### Estructura de Directorios `\NeuroPod-Frontend\src\App.tsx`
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
import AdminTemplates from "./pages/admin/Templates";
import ClientStats from "./pages/client/Stats";
import ClientPods from "./pages/client/Pods";
import ClientSettings from "./pages/client/Settings";
import ClientHelp from "./pages/client/Help";
import ClientPodDeploy from "./pages/client/PodDeploy";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
```

### Rutas Configuradas `\NeuroPod-Frontend\src\App.tsx`
```javascript
<Route path="/" element={<Index />} />
<Route path="/login" element={<Login />} />
<Route path="/signup" element={<Signup />} />
<Route path="/pricing" element={<Pricing />} />
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
{/* Admin Routes */}
<Route path="/admin/pods" element={<ProtectedRoute requiredRole="admin"><AdminPods /></ProtectedRoute>} />
<Route path="/admin/pods/deploy" element={<ProtectedRoute requiredRole="admin"><AdminPodDeploy /></ProtectedRoute>} />
<Route path="/admin/templates" element={<ProtectedRoute requiredRole="admin"><AdminTemplates /></ProtectedRoute>} />
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

## Funcionalidades casi terminadas y hechas

### Contexto de Saldo (Falta simbolo infinito para admin)
- **Estado**: Hecho, Admin no muestra el simbolo decorativo de infinito en su barra lateal
- **Admin**: Saldo infinito (simbolo decorativo) en `/admin/pods` y `/admin/pods/deploy` asi como su respectiva barra lateral
- **Cliente**: Saldo inicial de 10€ en `/client/pods`, `/client/pods/deploy` y su respectiva barra lateral, que disminuye según uso
- Mostrar saldo en la barra lateral de las páginas correspondientes
- Admin puede asignar saldo a usuarios

### Página Principal (/)
- **Estado**: Hecho
- Hacer que la sección de documentación abra "https://github.com/Zidane0MA/NeuroPod"

### Registro (/signup)
- **Estado**: Hecho
- Probar funcionalidad de registro desde el frontend

### Login (/login)
- **Estado**: Hecho
- Usuario `lolerodiez@gmail.com` debe tener acceso como admin

## Funcionalidades para despues

### Pricing (/pricing)
- **Estado**: Implementar y conectar
- No requiere cambios a nivel de UI
- Que los precios de las GPUs se cambien desde `/admin/settings`

### Dashboard (/dashboard)
- **Estado**: Implementar y conectar
- Mantener diseño actual
- **Para Admin**:
  - Mostrar métricas: "Pods totales", "Pods activos", "CPU promedio", "Usuarios Activos", "Ganancias"
  - Mostrar gráfico de "Rendimiento del sistema"
  - Mostrar "Logs del Sistema"

## Funcionalidades ya implementadas y hechas

### Gestión de Templates (/admin/templates)
- **Estado**: HECHO y funcional, falta mejorar diseño.
- **Diseño**: Mejorar el diseño de la card del archivo `NeuroPod-Frontend\src\pages\admin\Templates.tsx` (lineas 190-232).
```tsx
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="shadow-md border border-muted bg-white hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row justify-between items-center pb-2">
                <div>
                  <CardTitle className="text-lg font-semibold">{tpl.name}</CardTitle>
                  <div className="text-xs text-muted-foreground">{tpl.dockerImage}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenModal(tpl)}>
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(tpl.id)}>
                    Eliminar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">HTTP:</span>{" "}
                    {tpl.httpPorts.map(p => `${p.port} (${p.serviceName})`).join(", ")}
                  </div>
                  {tpl.tcpPorts.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">TCP:</span>{" "}
                      {tpl.tcpPorts.map(p => `${p.port} (${p.serviceName})`).join(", ")}
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Container Disk:</span> {tpl.containerDiskSize} GB
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Volume Disk:</span> {tpl.volumeDiskSize} GB
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Path:</span> {tpl.volumePath}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
```
- **Funcionalidad**:
  - Lista plantillas existentes en la base de datos a través de la api como cards.
  - Botón para crear plantillas, abre un modal.
  - En el modal se puede:
    - Insertar el nombre del template
    - Insertar el nombre de la imagen de docker a usar. (Que este al costado del anterior)
    - Seccion de puertos HTTP a exponer y nombres:
      - Especificar el puerto HTTP y agregar el nombre del servicio que le corresponde. (mostrar 2 de estos en una fila por defecto), al lado de estos 2 un boton verde de (+) para agregar una nueva fila. 
      - Si se planea agregar mas puertos, darle al nuevo boton (+), a partir de la segunda fila tambien se muestra un boton de (-)
    - Seccion de puertos TCP a exponer y nombres (decorativo, no pensado para implementar):
      - Mismo comportamiento del puerto HTTP
    - Los 2 tamaños de disco que se tienen, al igual que `/pods/deploy` (Respetar los nuevos limites de tamaño, editar limites de `/pods/deploy`)
    - Una casilla de texto donde se podra ingresar el volume path. (Se debe mostrar por defecto /workspace)
    - Una casilla de texto markdown donde el admin podrá ingresar detalles de la plantilla. (no cambiar comportamiento ni diseño)
    - Un botón de guardar
  - Poder editar y eliminar plantillas con botones.
  - Tener en cuenta: Las plantillas listadas aqui se mostraran e `/pods/deploy` como templates sea para admin o cliente

## Funcionalidades en actual implementacion
### Gestión de Pods (/admin/pods y /client/pods)
- **Estado**: En actual implementacion y conexion con el backend y agregar funcionalidades en el frontend
- **Falta**: Solucionar problemas, crear el pod con kubernetes, arreglar los puertos, mostrar stats del pod.
- **Diseño**: Cambiar diseño del modal de acuerdo a las nuevas funcionalidades. Agregar seccion para admin que permita buscar y listar pods por usuario en `/admin/pods`.
- **Funcionalidad**:
  - Listar pods creados por el usuario
    - El cliente vera sus pods creados por el mismo o pods asignados hacia el por el admin
    - El admin puede ver sus pods, tambien puede buscar por un correo y ver los pods de un usuario en concreto
    - El sistema de buscar pods del admin reemplaza la funcion de listar todos los pods de los usuarios para el admin
  - Mostrar para cada pod:
    - Nombre (obtenido al crear pod)
    - Estado (detenido/ejecutándose)
    - GPU elegida (reemplazar sección "Correo" por GPU elegida)
    - Tiempo Activo (mostrar "-" si está detenido)
    - CPU (porcentaje, mostrar "No disponible" si está detenido)
    - Memoria (mostrar "No disponible" si está detenido)
    - GPU (porcentaje, mostrar "No disponible" si está detenido)
  - **Botones por pod**:
    - Iniciar/Detener
      - Al darle iniciar se arranca el servicio y se debera crear un pod en el sistema
    - Eliminar
    - Conectar (Modal con puertos)
    - Modal diseño:
      - Por cada seccion de conexion: Nombre (HTTP service → :"puerto HTTP"), debajo de este "nombre de servicio", al costado de estos un boton de abrir. Lo mismo para TCP (TCP service --> :"puerto TCP") pero manternerlo decorativo igual que su boton.
    - Modal Casos:
      - Template seleccionado sin cambios: Los puertos que envie el usuario seran los puertos internos del contenedor a asociar. Como es un template, los puertos vienen con nombre, mostrarlo como "nombre de servicio".
      - Template seleccionado + casilla Jupyter Lab: Si la template viene con Jupyter Lab no hay problemas, si el template viene sin jupyter lab, mostrar esta nueva conexion por el puerto 8888 y el nombre Jupyter Lab como "nombre de servicio".
      - Imagen docker: Como no es un template, se desconoce el nombre de los servicios que tendra el contenedor, mostrar los nombres como (Servicio "numero del servicio del 1 al 10"), la cantidad de secciones es de acuerdo al numero de puertos que ingresara el usuario.
      - Imagen docker + casilla Jupyter Notebook: El puerto 8888 se asocia a Jupyter Lab y el resto de puertos como el caso anterior.
      - En caso de que el usuario ingrese mas puertos en `/pods/deploy`, estos apareceran como (HTTP service → :"puerto") dentro del modal y el nombre sera (Servicio "numero del servicio del 1 al 10")
    - Logs (Modal con logs del contenedor del pod)
  - Actualizar estado desde backend si un pod cae por sistema

### Despliegue de Pods (/admin/pods/deploy y /client/pods/deploy)
- **Estado**: En actual implementacion, modificar los archivos  
- **Hecho**: Actualmente se tienen creado tanto en frontend como el backend los archivos correspondientes.
- **Falta**:
  - Cambio de estructura del formato de manifiestos de pods en el backend, se tiene el nuevo formato en MANIFIESTOS_FOMATOS.md
  - Tener en cuenta los cambios anteriores y verificar si el frontend los soporta, en caso contrario actualizar el codigo.
  - En el frontend se cargan ejemplos de pods llamados podslegacy, se necesita reducir su numero a 2 y actualizar el formato de podslegacy, esto con el fin de eliminar las parte de codigo encargardas de su conversion a un formato accesible. cambiar el nombre a uno mas enfocado a ser una muestra.
  - Cambio en el backend, se tienen variables de precios de los costes de las GPU (exceden las 3 requeridas)
  - Cambiar el limite de Container Disk (máximo 100 GB)
- **Diseño**: Mantener diseño UI, pero arreglar problemas como:
  - En la seccion Configuracion del Pod, hacer que la seccion, puertos y la casilla jupyter notebook, se muevan debajo de la seccion de discos
  - Cambiar los limites del los discos: Container Disk (máximo 100 GB)
  - Despues de seleccionar un template, no se abre el modal correspondiente al markdown
  - Despues de seleccionar un template, la barra de los discos no se actualiza (visual) a la informacion del template
- **Selecciona una GPU**:
  - Que los precios de las GPUs se obtengan desde el backend y que en `/admin/settings` en la seccion precios se pueda cambiar los precios de las GPUs. Solo se planean tener 3 GPUS: RTX 4050, RTX 4080 y RTX 4090
- **Configuración de Pod**:
  - Nombre del pod (Unico en los pods del cliente, no usar solo esto para indentificar o crear los pods a nivel global)
  - Tipo de despliegue:
    - Template:
      - Boton de modal de nombre "elegir template" que permite seleccionar templates creados desde `/admin/templates`, al elegir uno cambiar nombre del boton a "[nombre del template] seleccionado", al costado del boton mostrar un incono de interrogación que al darle muestre el markdown correspondiente a la plantilla.
      - Al seleccionar template los valores como imagen de docker, nombre del volumen y valores de los discos esten presentes en la pagina y se le muestren en la configuracion del usuario. Para el tema de puertos como estara en un formato json asociados al nombre del servicio que le corresponde, obtener solo los puertos de ese json e ingresarlos a la seccion de puertos del frontend (separados por comas)
    - Imagen Docker:
      - Aqui el usuario inserta el nombre de una imagen de docker.
  - Puertos HTTP expuestos (separados por comas, si se selecciona imagen docker, mostrar 8888 por defecto para Jupyter Lab), casos:
      - Template seleccionado: Se obtendran los puertos del json y se mostraran en pantalla. Si dentro del json esta el puerto 8888, la casilla Jupyter Lab sea en el estado que este, no cambia funcionalidades.
      - Template seleccionado + casilla Jupyter Lab: Se obtendran los puertos del json y se mostraran en pantalla. Si dentro del json no esta el puerto 8888 y la casilla jupyter lab esta activada, se le enviara una peticion al contenedor de instalar jupyter Lab, si el usuario no agrega el puerto 8888 manualmente sera su problema.
      - Imagen docker seleccionada: El usuario ingresara los puertos a exponer manualmente bajo su riesgo.
      - Imagen docker + casilla Jupyter Lab: Si la casilla esta seleccionada, instalar el servicio, si el usuario no tiene el puerto 8888 en la seccion de puertos sera su problema.
  - Puertos TCP expuestos (separados por comas): Agregar esta parte al frontend pero mantenerla decorativa.
  - Casilla Jupyter Lab (seleccionada por defecto)
  - Container Disk (máximo 100 GB)
  - Volume Disk (máximo 150 GB, se monta en /workspace)
  - Sección Pricing Summary (verificar cálculo con cambios en `/admin/settings`)
  - Sección Pod Summary
- **Solo para Admin**:
  - Campo "Asignar a Usuario" (correo del cliente)
- **Start Deploy**:
  - Admin sin especificar correo → Crea en `/admin/pods`
  - Admin con correo registrado → Crea en `/client/pods` del cliente
  - Cliente → Crea en su propio `/client/pods`
  - Nota de funcionamiento: El admin puede ver sus pods y los pods del cliente que decida buscar por el correo.

## Funcionalidades para despues

### Estadísticas de Cliente (/client/stats)
- **Estado**: Implementar y conectar
- **Mostrar**:
  - "Pods creados", "Pods activos", "CPU promedio", "Dinero Gastado"
  - Gráfico de uso de recursos en 24h
  - Logs del último pod modificado
  - Lista simplificada de pods en ejecución

### Configuración de Cliente (/client/settings)
- **Estado**: Implementar y conectar
- **Funcionalidades**:
  - Cambiar nombre (afecta barra lateral y tabla en `/admin/users`)
  - Eliminar todos los pods
  - Eliminar cuenta y datos

### Configuración de Admin (/admin/settings)
- **Estado**: Implementar, conectar y corregir
- **Modificaciones en UI requeridas**
- **Secciones**:
  - **Perfil**:
    - Cambiar nombre
    - *NUEVO*: Botón para eliminar solo los pods del admin
    - Botón para eliminar todos los pods del sistema
    - Botón para eliminar cuenta 
  - **Sistema**:
    - Auto-apagado de pods inactivos
    - Tiempo de inactividad (minutos)
    - Notificaciones por email (decorativo)
    - Modo mantenimiento (detiene todos los pods)
  - **Precios**:
    - Configurar precios de GPUs y almacenamiento
    - Botón "free tier" (decorativo)
  - **Logs y backup**:
    - Mostrar logs igual que en `/dashboard`
    - Logs guardados en archivo descargable
    - Sección backup (decorativa)

### Gestión de Usuarios (/admin/users)
- **Estado**: Implementar, conectar y corregir
- **Funcionalidades**:
  - Búsqueda por nombre o correo
  - Filtros (pods activos, conectados)
  - Tabla de usuarios con:
    - Correo, nombre, pods (n/n), estado (online/offline)
    - Modal de detalles (email, nombre, fecha de registro, pods, saldo, estado)
    - Modal para asignar saldo
    - Modal para suspender usuario
    - Modal para eliminar usuario
  - Botón "Cargar Más" (paginación de 15 en 15)
- **Correcciones**:
  - Eliminar columna "salario"
  - Cambiar "asignar salario" por "asignar saldo"