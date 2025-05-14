Todas las funciones en el frontend de neuropod a implementar:
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
y tengo estas rutas en el frontend:
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
Funciones a implementar, conexion entre backend y frontend, conexion con kubernetes, cambios a realizar, crear y contextos:
•	Contexto de saldo:  El admin, en las rutas /admin/pods, /admin/pods/deploy se tiene saldo infinito (decorativo) puede crear pods sin coste alguno, ademas en la barra lateral de las paginas que le corresponden tambien se muestra ese saldo. El cliente, en las rutas /client/pods y /client/pods/deploy se muestra un saldo inicial de 10 euros, que se va restando de acuerdo al uso por horas de los pods, ademas en la barra lateral de las paginas que le corresponden tambien muestran el saldo del usuario. En principio no planeo implementar un sistema de pago, por lo que el admin podra asignar saldo a los usuarios.
•	Estado: falta, ruta: /, que la seccion de documentacion abra "https://github.com/Zidane0MA/NeuroPod"
•	Estado: falta, conexion, ruta: /singup, falta probar si se puede registrar desde el frontend.
•	Estado: falta, conexion, ruta: /login, falta probar si se puede logear desde el frontend.
o	Cuando me logeo con lolerodiez@gmail.com tengo acceso como admin.  
•	Estado: Hecho, ruta: /pricing, sin cambios. -- No quiero extender mas funcionalidad.
•	Estado: implementar y conectar, ruta: /dashboard, No cambiar Diseño -- Ya muestra el contenido dependiendo del tipo de usuario.
o	Solo para admin: Mostrar cantidad de "Pods totales" en el sistema, "Pods activos" en el sistema, Calcular "CPU promedio" del sistema, Mostrar "Usuarios Activos" y "Ganancias" que se obtiene de juntar el dinero gastado de los clientes.
o	Solo para admin: Mostrar un grafico del "Rendimiento del sistema", Mostrar los "Logs del Sistema".
•	Estado: Implementar y conectar, ruta: /admin/pods y /client/pods, No cambiar Diseño. -- Solo agregar funcionalidades.
o	Contexto: Aquí se muestra una lista de pods creados por usuario (admin y cliente), los pods se crean desde /admin/pods/deploy o /clients/pods/deploy. Los usuarios ven sus propios pods, el admin tiene la opcion de asignar pods desde /admin/pods/deploy a los usuarios a traves del correo. En /pods/deploy se pueden elegir “servicios” como:
	Templates | imágenes: En templates se tiene Ubuntu o ComfyUI, en imágenes se puede ingresar el nombre de una imagen de docker. Si se elige 1 template, se asigna un puerto introducido por el usuario. Si se selecciona una imagen, se asigna los puertos requiridos por la imagen por parte de usuario (Esta parte es experimental).
	Jupiter Notebook: Va junto al servicio a instalar en el contenedor. Si esta seleccionado se asigna el puerto 8888.
o	Para usuario (admin y cliente): Se debe listar los pods de cada usuario (detenido o Ejecuntandose), los pods listados se muestran como una caja (ya echo), Contienen:
	Nombre: se obtiene al crear un pod desde pods/deploy, cambiar el comportamiento para que no sea desde solo el frontend.
	Estado: detenido o Ejecuntandose (ya se realiza el cambio al dar al boton de iniciar/detener), cambiar el comportamiento, si un pod cae por sistema, actualizar el frontend desde backend.
	Correo (no necesario): Cambiar esta seccion por la GPU elegida en /pods/deploy.
	Tiempo Activo: Mostrar el tiempo activo del pod despues de cada inicio, si el estado es detenido mostrar una raya “-“ (ya echo desde el frontend).
	CPU: Mostrar el estado en porcentaje del CPU obtenible del pod, si el estado es detenido mostrar “No disponible” (ya hecho desde el frontend).
	Memoria: Mostrar la cantidad de Memoria RAM usada del pod (se establece desde /pods/deploy al crear un pod), si el estado es detenido mostrar “No disponible” (ya hecho desde el frontend).
	GPU: Mostrar el estado en porcentaje de la GPU obtenible del pod, si el estado es detenido mostrar “No disponible” (ya hecho desde el frontend).
o	Para usuario (admin y cliente): Cada pod listado tiene una serie de botones (ya creados en el frontend) que realizan una accion.
	boton de Iniciar/Detener: Inicia o detiene un pod creado por el usuario.
	boton Eliminar: eliminar un pod creado por el usuario
	Boton Connect: Muestra un modal (ya hecho), en este modal se muestra una lista (ya echa pero en el frontend) de puertos que incluyen:
•	Nombre del servicio: Se obtienen desde /pods/deploy.
•	Puerto “numero de 4 digitos”: Se obtienen desde /pods/deploy.
•	Boton de abrir: Nos lleva al servicio asignado al puerto abriendo una ventana.
	Boton de Logs: Muestra un modal (ya echa) que contiene:
•	Nombre de pod: Ya echa pero solo desde el frontend.
•	Logs: Aquí se deben mostrar lo logs del pod.
•	Estado: Implementar y conectar, ruta: /admin/pods/deploy y /client/pods/deploy, No cambiar Diseño. -- Solo agregar funcionalidades.
o	Contexto: Como admin se tiene un saldo “infinito”. Aquí se puede elegir entre GPUs, solo es decorativo, como el proyecto corre en solo 1 portatil, siempre estara seleccionada la GPU “NVIDIA RTX 4050”, tambien se eligen las configuraciones del pod y por ultimo se puede iniciar un pod con Start Deploy. Aunque se muestre que los usuarios tienen saldo, no quiero incluir un sistema de pago, este proyecto es una prueba, por lo que el usuario admin tiene la opcion de asignar saldo a los usuarios desde /admin/users (aun no implementado), el admin es capaz de modificar los precios de las GPUs que aparece en /pods/deploy desde /admin/settings en la seccion de Precios, tambien puede modificar los precios de Container Disk y Volume Disk de la pagina desde la misma ruta. Por ultimo el admin puede crear templates y mostrarlas en la pagina /pods/deploy desde la ruta /admin/settings en la seccion de Plantillas.
o	Para usuario (admin y cliente): En la Configuracion del Pod (ya echo en frontend) se tiene:
	Nombre del pod:  Este nombre se mostrara en /admin/pods/ y/o /client/pods/ dependiendo de la configuracion del pod debe ser un nombre unico.
	Tipo de despliegue: Muestra 2 opciones: 
•	Template: Se podra elegir entre Ubuntu que estara marcado por defecto y ComfyUI, (crear/ modificar frontend) podran apareceran mas plantillas las cuales seran creadas desde /admin/settings en la seccion plantillas.
•	Imagen Docker: Podremos escribir el nombre de la imagen docker que usaremos
	Puertos: Se puede escribir varios numeros de puerto separados por comas, por defecto se muestra 8888 que le corresponde a Jupyter Notebook en caso de que este seleccionado, los demas puertos se asociaran al tipo de servicio que se ejecutara en el pod.
	Casilla de Jupyter Notebook: si esta seleccionada se asocia al puerto 8888, seleccionada por defecto (ya echo en el frontend).
	 Container Disk (Archivos Temporales): Se puede elegir la cantidad de memoria, aquí tambien se muestra el precio de acuerdo al tamaño, los precios €/GB/hora se establecen desde /admin/settings en la seccion de Precios. Baja a 50 GB el maximo en el frontend.
	Volume Disk (Datos Persistentes): Se crea como /workspace. Se puede elegir la cantidad de memoria, aquí tambien se muestra el precio de acuerdo al tamaño, los precios €/GB/hora se establecen desde /admin/settings en la seccion de Precios. Baja a 250 GB el maximo en el frontend.
	Seccion de Pricing Summary: Aquí el frontend calcula un total, verifica si el cambio en /admin/settings afectan el calulo.
	Seccion de Pod Summary: Aquí el fronted ya registra los cambios.
o	Solo para admin: En la Configuracion del Pod (ya echo en frontend) se puede ingresar:
	Asignar a Usuario: Se puede ingresar el correo del cliente al que asignaremos un pod y que solo el cliente podra verlo.
o	Boton Start Deploy: Esto crea un pod que se vera reflejado en /admin/pods y/o /client/pods dependiendo el caso:
	Si lo crea un Admin sin espicificar un correo: Se crea su ruta /admin/pods.
	Si lo crea un Admin y especifica un correo registrado: Se crea solo para el cliente en /client/pods.
	Si lo crea un cliente: Se crea solo para el cliente en /client/pods.
	Consideraciones: Se supone que aquí se armara el pod con la informacion obtenida de /pods/deploy, por lo que se tendra en cuenta los puertos que escriba el usuario y se monstraran en el modal abierto por el boton connect y seguiran las reglas especificadas anteriormente.
•	Estado: Implementar y conectar, ruta: /client/stats.
o	Contexto: Esta pagina es el dashboard del cliente.
o	Para cliente: Mostrar cantidad de "Pods creados" por el cliente, "Pods activos" del cliente, Calcular "CPU promedio" de lo que usa y Mostrar "Dinero Gastado" que se obtiene de lo que consumen sus pods desde el principio. En Rendimiento del Sistema se muestra un grafico sobre el uso de recursos en 24h. Logs del Ultimo Pod, muestra el nombre del ultimo pod modificado, ya sea por creacion o cambio de estado y muestra tambien los logs de ese pod. Uso de Recursos por Pod, Muestra una lista simplificada de los pods creados por el cliente y que esten en ejecucion, se obtendra los detalles de la forma similar que en /client/pods.
•	 Estado: Implementar y conectar, ruta: /client/settings.
o	Contexto: Pagina de configuracion del cliente, aquí puede cambiar su nombre, eliminar todos sus pods, eliminar su cuenta y sus datos. Aquí hay acciones que cambian el como se muestra el contenido de las paginas al usuario.
o	Para el cliente: En perfil de Usuario tiene el campo nombre, donde podra cambiar su nombre y este cambio se confirmara con el boton de Guardar Cambios. Los cambios realizados aquí afectaran la barra lateral de las paginas que le corresponden en el campo donde se muestra su nombre y tambien a su respectivo campo de tabla en la ruta /admin/users.
o	Para el cliente: En Acciones de Cuenta se tiene las opciones de Eliminar todos los pods desde el boton Eliminar Pods, tambien se podra eliminar la cuenta y datos desde el boton Eliminar Cuenta.
•	Estado: Implementar y conectar, ruta: /admin/settings.  – Modificaciones requeridas en frontend a nivel UI.
o	Contexto: Desde esta pagina se puede configurar el perfil, sistema, plantillas, precios y ver logs. Aquí hay acciones que cambian el como se muestra el contenido de las paginas al usuario.
o	Para el admin: En el perfil se puede cambiar el nombre y guardar cambios, como antes los cambios realizados aquí afectaran la barra lateral de las paginas que le corresponden en el campo donde se muestra su nombre. En Acciones del Perfil se tiene las opciones de Eliminar todos los pods del sistema desde el boton Eliminar todos los Pods, tambien se podra eliminar la cuenta y datos desde el boton Eliminar Cuenta, me gustaria que agregue un nuevo boton en el frontend que realice la accion de borrar los pods del admin asociados a su cuenta como usuario.
o	Para el admin: En sistema se tiene un Auto-apagado de pods inactivos si esta estado on, apaga los pods despues de un tiempo de inactividad que se establece en Tiempo de inactividad (minutos). Notificaciones por email, esta parte mantenla decorativa. El modo mantenimiento hace que todos los pods de los usurios esten detenidos.
o	Para el admin: en plantillas se puede editar las plantillas que se mostraran en /pods/deploy, si se da al boton de editar se debe mostrar un modal (ya echo), el cual se podra ingresar el nombre de la imagen, la descripcion y guardar. (Cambiar en frontend) En la parte de crear nueva plantilla y el boton de crear, mantenlas decorativas.
	 Errores en la seccion plantillas: Las plantillas se muestran con una imagen, eliminar esa imagen, el modal que se abre en editar no muestra los detalles ya configurados, el modal tambien tiene una seccion de Url de la imagen, cambiar por Imagen docker, el modal muestra vista previa de la imagen, eliminar esa vista previa.
o	 Para el admin: En Precios, se puede establecer los precios de las GPUs y los precios de Almacenamiento, estos cambios se muestran a nivel global para todos los usuarios al momento de darle al boton de guardar precios. El boton de free tier mantelo decorativo.
o	Para el admin: Logs y backup, muestra los mismos logs de /dashboard pero este se guardan en un archivo que despues se podra descargar. Toda la parte de backup mantenla decorativa.
•	Estado: Implementar y conectar, ruta: /admin/users.  – Agregar funcionalidad y crear/modificar en frontend
o	Contexto: Esta pagina sirve para gestionar todos los clientes desde una tabla, se necesita que se busque por nombre o correo, se puede filtrar por pods activos y/o conectados, se limpia el filtro y tiene el boton de buscar. Cada cliente aparece con su correo, nombre, pods(n/n), estado (online/offline), un icono que abre una modal para ver detalles del usuario (email, nombre, fecha de registro, pods, saldo, estado), un icono que abre un modal para asignar saldo a un cliente (el saldo ingresado se sumara al saldo del cliente),un icono que abre un modal de suspender usuarios (detiene todos los pods de ese usuario) y un icono que abre un model de eliminar usuario. Por ultimo hay un boton abajo del todo “Cargar Mas” el cual extiende la pagina.
o	Errores en la pagina: Hay una columna llamada salario la cual se debe eliminar, el icono para asignar saldo en realidad asigna salario, cambiar y arreglar esa funcionalidad.
o	Para el admin: Que se listen los usarios de acuedo a la base de datos, se pueda buscar por nombre o email, que los filtros funcionen, que la informacion dentro del modal corresponda con el usuario, que dentro del modal de asignar saldo que permita asignar mas saldo al usuario correspondiente, que al dar al boton cargar mas se envie una solicitud a la base de datos dando mas usuarios de 15 en 15.













