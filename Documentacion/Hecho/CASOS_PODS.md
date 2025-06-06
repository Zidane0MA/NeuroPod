Modificar NeuroPod-Backend\src\utils\podHelpers.js, NeuroPod-Backend\src\services\kubernetes.service.js, NeuroPod-Backend\src\services\podMonitor.service.js y otros archivos para que se gestionen de forma unificada los siguientes casos:

# Comportamientos que se envian desde el frontend

```javascript
// POST /api/pods - Payload COMPLETO
{
  // 🔧 CONFIGURACIÓN BÁSICA (siempre requerido)
  "name": "mi-pod-test",
  "gpu": "rtx-4050",
  "containerDiskSize": 20,
  "volumeDiskSize": 50,
  "ports": "8888, 3000, 7860",
  "enableJupyter": true,

  // 🎯 TIPO DE DESPLIEGUE (uno de los dos)
  "deploymentType": "template", // o "docker"
  
  // Si deploymentType === "template"
  "template": "template_uuid_1",
  
  // Si deploymentType === "docker" 
  "dockerImage": "ubuntu:22.04",

  // 👤 ASIGNACIÓN DE USUARIO (solo disponible para admin)
  "assignToUser": "cliente@email.com" // ⭐ ESTE ERA EL CAMPO FALTANTE
}
```

- PTemplate seleccionado: 



- Template seleccionado + casilla Jupyter Lab: Se obtendran los puertos del json del template, si dentro del json no esta el puerto 8888 y la casilla jupyter lab esta activada, se le enviara una peticion al contenedor de instalar jupyter Lab. Si en la peticion de crear un pod no se se encuentra el puerto 8888, manejarlo como un error preparado.

- Imagen docker seleccionada: El usuario ingresara los puertos a exponer manualmente bajo su riesgo.

- Imagen docker + casilla Jupyter Lab: Si la casilla esta seleccionada, instalar el servicio, si el usuario no tiene el puerto 8888 en la seccion de puertos sera su problema.

## Template seleccionado

### Caso template con puerto 8888

1. La imagen ya tiene jupyter, por lo que sobra scripts de instalacion de jupyter 

2. La imagen no tiene jupyter pero lo soporta (tiene instalado lo necesario como python), se necesitan todos los scripts. 

3. La imagen no tiene jupyter y no lo soporta, scripts completos de instalación. También manejar el caso de jupyter y su url + token, por lo que supongo que se tendrá que volver a aplicar el manifiesto del Ingress. Tener en cuenta también los puertos y no olvidarte de que la imagen puede contener o no otro servicio.

### Caso template sin puerto 8888


### Caso template sin puerto 8888 y casilla jupyter Lab seleccionado


          - Modal Casos:
      - Template seleccionado sin cambios: Los puertos que envie el usuario seran los puertos internos del contenedor a asociar. Como es un template, los puertos vienen con nombre, mostrarlo como "nombre de servicio".
      - Template seleccionado + casilla Jupyter Lab: Si la template viene con Jupyter Lab no hay problemas, si el template viene sin jupyter lab, mostrar esta nueva conexion por el puerto 8888 y el nombre Jupyter Lab como "nombre de servicio".
      - Imagen docker: Como no es un template, se desconoce el nombre de los servicios que tendra el contenedor, mostrar los nombres como (Servicio "numero del servicio del 1 al 10"), la cantidad de secciones es de acuerdo al numero de puertos que ingresara el usuario.
      - Imagen docker + casilla Jupyter Notebook: El puerto 8888 se asocia a Jupyter Lab y el resto de puertos como el caso anterior.
      - En caso de que el usuario ingrese mas puertos en `/pods/deploy`, estos apareceran como (HTTP service → :"puerto") dentro del modal y el nombre sera (Servicio "numero del servicio del 1 al 10")
    - Logs (Modal con logs del contenedor del pod)
  - Actualizar estado desde backend si un pod cae por sistema


/**
* Controlador para la gestión de recursos del pod.
*
* Puntos de conexión principales:
* - getPods: Obtener todos los pods del usuario actual o de un usuario específico (solo administrador).
* - getPodConnections: Obtener información de conexión de un pod específico.
* - createPod: Crear un nuevo pod con la configuración especificada.
* - startPod: Iniciar un pod detenido.
* - stopPod: Detener un pod en ejecución.
* - deletePod: Eliminar un pod y sus recursos.
* - getPodLogs: Recuperar registros de un pod específico.
*
* Funciones auxiliares:
* - findPodWithAccess: Buscar un pod por podId y comprobar el acceso del usuario.
* - validatePodState: Validar el estado actual de un pod.
* - updatePodStatus: Actualizar el estado de un pod y sus servicios.
* - handleControllerError: Gestión de errores estandarizada para las respuestas del controlador. 
*
* Funciones de lógica de negocio:
* - getPodsForUser: Recupera pods para un usuario, con lógica de administrador/usuario.
* - determinePodOwner: Determina el propietario de un pod (para la asignación de administrador).
* - validateUserBalance: Comprueba si un usuario tiene saldo suficiente para crear un pod.
* - createPodRecord: Crea un nuevo documento de pod en la base de datos.
* - deductBalanceIfClient: Resta saldo de un usuario cliente tras la creación del pod.
* - getPodLogsContent: Recupera registros de Kubernetes para un pod.
* - stopPodResources: Detiene y limpia los recursos de Kubernetes para un pod.
*
* Funciones asíncronas de Kubernetes:
* - createKubernetesResourcesAsync: Crea recursos de Kubernetes para un pod de forma asíncrona.
* - recreateKubernetesResourcesAsync: Recrea recursos de Kubernetes para un pod de forma asíncrona.
* - deleteKubernetesResourcesAsync: Elimina de forma asíncrona los recursos de Kubernetes de un pod.
* - scheduleJupyterTokenCapture: Programa la recuperación del token de Jupyter tras la creación del pod.
*
* Funciones de validación y configuración:
* - validatePodPayload: Valida la carga útil para la creación del pod.
* - processPodConfiguration: Procesa y asigna la configuración para la creación del pod.
* - assignServiceNames / assignServiceNamesDocker: Asigna nombres de servicio a los puertos.
* - createServiceObject: Ayuda para crear un objeto de servicio para un pod.
* - calculatePodCost / calculatePodCostAsync: Calcula el coste estimado de un pod.
*
* @module controllers/pod.controller
*/