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
