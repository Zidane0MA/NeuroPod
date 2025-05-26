# **Habilitando la Aceleración GPU de NVIDIA RTX 4050 para Pods de Minikube en Windows con Docker Desktop**

## **I. Introducción: Cerrando la Brecha para Minikube Acelerado por GPU en Windows**

La integración de la aceleración por GPU en entornos de desarrollo local, como Minikube en Windows, ha sido tradicionalmente una fuente de confusión debido a la información aparentemente contradictoria. Si bien la documentación principal de Minikube pudo haber sugerido un soporte limitado para GPU en el pasado, el ecosistema ha evolucionado significativamente. Actualmente, es completamente factible y está bien soportado habilitar la aceleración GPU para los pods de Minikube en Windows, especialmente cuando se utiliza Docker Desktop con su backend WSL2.1

La percepción de una falta de soporte directo por parte de Minikube se origina en la arquitectura de la integración de GPU. Minikube, como distribución de Kubernetes, no gestiona directamente los controladores de GPU de Windows ni la transferencia de hardware. En cambio, depende del entorno de ejecución de contenedores subyacente (Docker) y de su entorno de host (WSL2 en Windows) para exponer las capacidades de la GPU. La afirmación de "no hay soporte" podría referirse a métodos más antiguos y menos integrados, o a la transferencia directa de hardware, que difiere del enfoque moderno y optimizado en Windows. Esta comprensión arquitectónica es fundamental: la solución no implica que Minikube soporte directamente la GPU, sino que Minikube utiliza una instancia de Docker Desktop que ya tiene acceso a la GPU a través de WSL2.

Esta capacidad se logra aprovechando la tecnología de paravirtualización de NVIDIA dentro de WSL2. La NVIDIA RTX 4050, al ser una GPU NVIDIA moderna, es totalmente compatible con CUDA y la paravirtualización de GPU de WSL2.1 El éxito de esta configuración depende de la utilización de las versiones estables más recientes de todos los componentes involucrados: los controladores de NVIDIA, Windows, WSL2, Docker Desktop y Minikube. Mantener estos componentes actualizados garantiza la compatibilidad y el acceso a las funciones necesarias para una integración fluida de la GPU.1

## **II. Sección 1: Prerrequisitos Esenciales y Preparación del Sistema**

Para garantizar una configuración exitosa de la aceleración GPU en Minikube, es imperativo cumplir con una serie de requisitos de hardware y software, prestando especial atención a la compatibilidad de las versiones.

### **1.1 Requisitos de Hardware y Sistema Operativo**

La base de esta configuración es una GPU NVIDIA compatible con CUDA. Su NVIDIA RTX 4050 cumple plenamente este requisito, ya que todas las GPU NVIDIA modernas soportan CUDA. Esta es la condición fundamental de hardware para la aceleración GPU.1

En cuanto al sistema operativo, se requiere una instalación reciente y completamente actualizada de Windows 10 u Windows 11.1 La insistencia en que el sistema operativo esté "actualizado" no es solo una cuestión de estabilidad general, sino que es crucial porque las características de paravirtualización de GPU de WSL2 están estrechamente ligadas a las actualizaciones del kernel de Windows y a versiones específicas de los controladores de NVIDIA. Las compilaciones de Windows más antiguas podrían carecer de los "hooks" necesarios o presentar problemas de compatibilidad conocidos que ya han sido resueltos en versiones posteriores. Esto significa que cualquier inestabilidad o característica faltante en la capa del sistema operativo se propagará, afectando la capacidad de WSL2, Docker Desktop y, en última instancia, Minikube para aprovechar la GPU.

### **1.2 Instalaciones de Software Clave**

La correcta instalación y configuración de los componentes de software es un paso crítico para habilitar la aceleración GPU.

En primer lugar, se deben descargar e instalar los **últimos controladores de GPU NVIDIA estables para Windows** directamente desde el sitio web oficial de NVIDIA. Estos controladores deben ser compatibles con la paravirtualización de GPU de WSL2.1 Es de vital importancia **no instalar ningún controlador de pantalla de Linux dentro de su distribución WSL2**. El controlador de Windows se paravirtualiza en WSL2 como libcuda.so. Instalar un controlador de Linux sobrescribirá este "stub" y romperá el acceso a la GPU, lo que resultará en errores de nvidia-smi o en la no detección de la GPU dentro de los contenedores.3 Esta advertencia es un detalle crítico y a menudo pasado por alto, que puede llevar a problemas significativos. La razón detrás de esto es una diferencia arquitectónica fundamental en cómo WSL2 maneja la virtualización de GPU en comparación con un entorno Linux nativo o una transferencia completa de VM. El "stubbing" de libcuda.so es un detalle técnico clave que explica por qué solo el controlador de Windows es necesario y por qué un controlador de Linux causaría conflictos.

A continuación, se debe instalar y actualizar el **Subsistema de Windows para Linux 2 (WSL2)**. Esto se realiza ejecutando wsl.exe --install desde PowerShell o el Símbolo del sistema, lo que configura el entorno Linux necesario para Docker Desktop.1 Posteriormente, se debe actualizar el kernel de WSL2 a la última versión utilizando wsl.exe --update. Un kernel actualizado es esencial para un rendimiento óptimo de la GPU y para asegurar la compatibilidad.2

El siguiente componente esencial es **Docker Desktop para Windows**. Se debe descargar e instalar la última versión de Docker Desktop desde el sitio web oficial. Docker Desktop actúa como el puente entre Windows, WSL2 y sus aplicaciones en contenedores.1 Un requisito de versión crucial es que Docker Desktop debe ser la versión **4.31.1 o posterior**. Las versiones anteriores (por ejemplo, 4.31.0) pueden tener problemas de compatibilidad con los controladores NVIDIA recientes debido a versiones desactualizadas del NVIDIA Container Toolkit que se incluyen con Docker Desktop.4 Es vital asegurarse de que el backend de WSL2 esté habilitado en la configuración de Docker Desktop, lo cual suele ser la configuración predeterminada, pero merece la pena verificarlo.2

Finalmente, se procede con la **instalación de Minikube**. Se recomienda seguir la guía oficial de instalación de Minikube para Windows. Aunque algunos recursos en línea pueden proporcionar pasos de instalación específicos para Linux 5, la documentación oficial de Minikube es la fuente más precisa y confiable para usuarios de Windows.6

La siguiente tabla resume los requisitos de versión clave para los componentes del software, proporcionando una referencia rápida para verificar que el entorno cumple con las versiones mínimas y recomendadas. Esta verificación proactiva puede prevenir muchos escenarios comunes de resolución de problemas.

**Tabla 1: Requisitos de Versión Clave del Software**

| Componente | Versión Mínima | Versión Recomendada/Última | Referencia |
| :---- | :---- | :---- | :---- |
| Sistema Operativo Windows | Windows 10/11 (actualizado) | Última versión estable | 1 |
| Kernel de WSL2 | 4.19.121+ | 5.10.16.3+ | 3 |
| Controladores de GPU NVIDIA (para Windows) | Última versión estable compatible con WSL2 GPU-PV | Última versión estable | 1 |
| Docker Desktop | 19.03+ | 4.31.1+ | 1 |
| Minikube | v1.29.0+ | v1.35.0 | 7 |

## **III. Sección 2: Habilitando el Soporte GPU para Docker Desktop a Través de WSL2**

Una vez que los prerrequisitos del sistema están en su lugar, el siguiente paso crucial es configurar Docker Desktop y WSL2 para que reconozcan y expongan la GPU de NVIDIA.

### **2.1 Configuración de WSL2 para Acceso a GPU**

La paravirtualización de GPU en WSL2 requiere una configuración explícita. Para habilitar el acceso a la GPU, se debe crear o modificar el archivo .wslconfig en el directorio de perfil de usuario de Windows (por ejemplo, C:UsersSuUsuario.wslconfig). Este archivo debe incluir la línea gpu=true bajo la sección [wsl2].1 Esta configuración explícita indica a WSL2 que habilite la función de compartición de GPU.

```Ini, TOML
[wsl2]  
gpu=true
```
Después de modificar el archivo .wslconfig, es fundamental apagar WSL por completo ejecutando wsl --shutdown en PowerShell o el Símbolo del sistema. Luego, se debe reiniciar el entorno WSL (por ejemplo, iniciando Docker Desktop o una terminal WSL) para que la nueva configuración surta efecto.1 El archivo .wslconfig actúa como el mecanismo de "handshake" explícito entre el host de Windows y la máquina virtual WSL2 para el uso compartido de recursos de GPU. Sin esta configuración, incluso si los controladores son correctos y Docker Desktop está instalado, el entorno WSL2 no estará configurado para exponer la GPU, lo que llevará a fallos inmediatos. Esto subraya la necesidad de una configuración explícita en la capa de paravirtualización, que es independiente de la configuración interna de Docker Desktop.

### **2.2 Integración del NVIDIA Container Toolkit**

Cuando se utiliza Docker Desktop para Windows, este gestiona e integra automáticamente el NVIDIA Container Toolkit dentro de su backend WSL2. Esto significa que, por lo general, no es necesario instalar manualmente el NVIDIA Container Toolkit dentro de su distribución WSL2.4 Docker Desktop se encarga de las configuraciones de tiempo de ejecución necesarias para el acceso a la GPU. Cabe destacar que, si se utilizara una instalación independiente de Docker Engine *dentro* de WSL2 (no Docker Desktop), sí sería necesario seguir las instrucciones específicas de NVIDIA para instalar el toolkit.1 Sin embargo, para la configuración del usuario (Minikube + Docker Desktop en Windows), este paso es automatizado.

Antes de proceder con Minikube, es crucial realizar un paso de validación intermedio para confirmar que Docker Desktop puede detectar y utilizar la GPU. Este paso aísla posibles problemas a la capa de Docker/WSL2 si Minikube falla posteriormente. Se debe ejecutar el siguiente comando en su terminal WSL2 (o PowerShell/CMD si Docker está configurado en su PATH):

```Bash
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

La salida esperada de este comando debe mostrar los detalles de su NVIDIA RTX 4050 y la información de nvidia-smi, lo que indica una detección y funcionalidad exitosa de la GPU dentro de un contenedor Docker.1 Este paso de validación es un punto de control diagnóstico crítico. Si este comando falla, el problema radica en la configuración de Docker Desktop/WSL2/controlador de Windows, no en Minikube. Esto permite una resolución de problemas dirigida, evitando que el usuario pierda tiempo depurando Minikube cuando el entorno Docker subyacente no está configurado correctamente para el acceso a la GPU. El objetivo final es el acceso a la GPU en los pods de Kubernetes, lo que implica una pila compleja (Host de Windows -> WSL2 -> Docker Desktop -> Minikube -> Pod de Kubernetes). Para solucionar problemas de manera efectiva, es esencial desglosar el problema en etapas más pequeñas y verificables. Este comando prueba específicamente las tres primeras capas, verificando la interacción del controlador NVIDIA de Windows con la paravirtualización de GPU de WSL2 y la integración exitosa del NVIDIA Container Toolkit por parte de Docker Desktop.

## **IV. Sección 3: Configurando Minikube para la Utilización de GPU NVIDIA**

Una vez que Docker Desktop está configurado correctamente con acceso a la GPU y se ha validado su funcionamiento, se puede proceder a iniciar el clúster de Minikube. La clave en este paso es utilizar el controlador docker y solicitar explícitamente los recursos de GPU.

### **3.1 Iniciando Minikube con Soporte GPU**

Para iniciar Minikube con soporte GPU, se debe ejecutar el comando minikube start con las banderas --driver=docker y --gpus all. Además, es altamente recomendable asignar suficientes recursos de memoria y CPU a la máquina virtual de Minikube, especialmente para cargas de trabajo intensivas en GPU, con el fin de evitar cuellos de botella en el rendimiento.6

El comando recomendado es el siguiente:

```Bash
minikube start --driver=docker --container-runtime=docker --gpus=all --memory=16000mb --cpus=8
```
Cada bandera en este comando tiene un propósito específico:

* --driver=docker: Esta bandera instruye a Minikube para que utilice Docker Desktop como su controlador de máquina virtual subyacente. Esta es la elección correcta para los usuarios de Windows que aprovechan la integración de WSL2 de Docker Desktop.6  
* --container-runtime=docker: Asegura que el tiempo de ejecución de contenedores Docker se utilice dentro del clúster de Minikube, lo que se alinea con el controlador de Docker Desktop.6  
* --gpus=all: Esta bandera crucial le indica a Minikube que exponga todas las GPU disponibles del entorno Docker al clúster de Kubernetes. También se puede especificar --gpus=nvidia para GPU específicas de NVIDIA, pero all suele ser suficiente.6  
* --memory=16000mb --cpus=8: Estas banderas asignan 16 GB de memoria y 8 núcleos de CPU a su máquina virtual de Minikube. Se pueden ajustar estos valores según las capacidades de su sistema y los requisitos de recursos de sus cargas de trabajo GPU.6

Es importante entender que la bandera --gpus es dependiente del contexto; solo funciona cuando se especifica --driver=docker. Esta es una distinción crítica, ya que Minikube tiene otros controladores (como kvm2) que podrían tener sus propias banderas de GPU diferentes (por ejemplo, --kvm-gpu 12). Utilizar la bandera incorrecta para el controlador elegido conducirá a fallos en el inicio. Esta especificidad de las banderas confirma el modelo de soporte en evolución de Minikube, donde la integración de la GPU varía según la tecnología de virtualización subyacente. Minikube es una herramienta flexible que se adapta a su entorno de host, y la elección del usuario de "Windows con Docker" dicta la bandera --gpus específica. Comprender esta dependencia evita configuraciones erróneas comunes donde los usuarios podrían intentar combinar banderas de diferentes contextos de controladores. También explica por qué el usuario pudo haber encontrado diferentes soluciones en línea, ya que estas se aplican a diferentes configuraciones de controladores de Minikube.

### **3.2 Comprensión de la Gestión de Recursos GPU de Kubernetes**

Dentro de Kubernetes, las GPU no se tratan como recursos estándar de CPU o memoria, sino que se exponen como "recursos extendidos" utilizando la convención de nombres nvidia.com/gpu.9 Esto permite a Kubernetes programar pods basándose en sus requisitos específicos de GPU, asegurando que las cargas de trabajo que demandan aceleración de GPU se ubiquen en nodos que la proporcionan.

Minikube ha mejorado continuamente su manejo de los plugins de dispositivos NVIDIA. Las versiones recientes (por ejemplo, v1.35.0, lanzada el 15 de enero de 2025) incluyen mejoras significativas, como la "Fusión de nvidia-gpu-device-plugin y nvidia-device-plugin".7 Esto indica un soporte mejorado y simplificado, lo que significa que Minikube despliega automáticamente los componentes necesarios (como el NVIDIA Kubernetes Device Plugin) para anunciar los recursos de GPU al servidor API de Kubernetes, haciéndolos disponibles para la programación.7 El hecho de que Minikube gestione esta fusión de plugins y configure automáticamente el NVIDIA Container Toolkit y el soporte de GPU implica un nivel significativo de abstracción y automatización para el desarrollo local. Los usuarios ya no necesitan desplegar manualmente DaemonSets para el plugin de dispositivos NVIDIA en Minikube, lo que era un paso manual común en configuraciones de GPU de Kubernetes más complejas y antiguas. Esto simplifica enormemente la experiencia del usuario para el desarrollo local, permitiéndole centrarse en desplegar sus aplicaciones aceleradas por GPU en lugar de dedicar tiempo a configuraciones complejas de infraestructura de Kubernetes para la gestión de recursos de GPU.

## **V. Sección 4: Despliegue y Validación de Cargas de Trabajo Aceleradas por GPU en Minikube**

Una vez que Minikube está configurado para utilizar la GPU, el siguiente paso es desplegar una carga de trabajo y verificar que la aceleración por GPU esté funcionando correctamente dentro de los pods.

### **4.1 Ejemplo de Manifiesto de Pod de Kubernetes para Acceso a GPU**

Para solicitar recursos de GPU para sus pods, se debe especificar nvidia.com/gpu en la sección resources.limits de su PodSpec. El valor indica el número de GPU requeridas (por ejemplo, '1' para una GPU, o más si están disponibles y son necesarias). Esta es la forma estándar de Kubernetes para expresar los requisitos de recursos de hardware.9

A continuación, se presenta un ejemplo de definición de Pod (YAML):

```YAML

apiVersion: v1  
kind: Pod  
metadata:  
  name: gpu-test-pod  
spec:  
  restartPolicy: Never  
  containers:  
  - name: cuda-container  
    image: nvidia/cuda:12.2.0-runtime-ubuntu22.04 # Usar una imagen habilitada para CUDA  
    command: ["nvidia-smi"] # O su aplicación acelerada por GPU  
    resources:  
      limits:  
        nvidia.com/gpu: "1" # Solicitar 1 GPU
```

La línea nvidia.com/gpu: "1" dentro de la sección resources.limits es la parte crítica. Informa a Kubernetes que este pod requiere una GPU NVIDIA para ejecutarse correctamente. Kubernetes intentará entonces programar este pod en un nodo (en este caso, su único nodo Minikube) que tenga los recursos de GPU solicitados disponibles.9

### **4.2 Verificación del Acceso a la GPU dentro de los Pods de Minikube**

Después de iniciar Minikube con soporte GPU y desplegar una carga de trabajo de prueba, es esencial verificar que la GPU sea realmente accesible desde dentro de los pods de Kubernetes.

Primero, se debe **verificar el estado del nodo** para confirmar que el nodo de Minikube ha anunciado correctamente los recursos de GPU al servidor API de Kubernetes:

```Bash
kubectl describe nodes minikube | grep -i gpu
```

La salida esperada debe mostrar nvidia.com/gpu: 1 (o más, dependiendo de las GPU de su sistema y la detección de Minikube), lo que indica que el nodo de Kubernetes reconoce la GPU.9

Luego, se puede **desplegar una carga de trabajo de prueba** para ejecutar nvidia-smi y verificar el acceso a la GPU desde dentro de un contenedor. Esta es una prueba directa de toda la cadena de aceleración de GPU:

```Bash
kubectl run gpu-test --image=nvidia/cuda:12.2.0-runtime-ubuntu22.04 --restart=Never -- nvidia-smi
```

Este comando crea un pod temporal utilizando una imagen habilitada para NVIDIA CUDA y ejecuta el comando nvidia-smi dentro de él.6

Finalmente, una vez que el pod gpu-test complete su ejecución (terminará después de que nvidia-smi se ejecute), se deben **inspeccionar los registros del pod**:

```Bash
kubectl logs gpu-test
```

Se debería ver información detallada sobre su RTX 4050, incluyendo la versión del controlador, la versión de CUDA y la utilización de la GPU. Esto confirma que el pod accedió y utilizó la GPU con éxito.9 Estos pasos de verificación proporcionan una prueba completa de extremo a extremo, desde la exposición inicial de la GPU por parte de Minikube hasta la ejecución exitosa de un comando de GPU por parte de un pod de Kubernetes. Esta validación holística es crucial para la confianza del usuario y para identificar sistemáticamente dónde podría existir un problema (por ejemplo, si kubectl describe nodes muestra la GPU pero nvidia-smi en el pod falla, el problema probablemente esté en la imagen del contenedor o en la configuración del tiempo de ejecución dentro de Kubernetes, no en la configuración inicial de Docker/WSL2).

## **VI. Sección 5: Resolución de Problemas Comunes y Mejores Prácticas**

A pesar de una configuración cuidadosa, pueden surgir problemas. Comprender los síntomas comunes, sus causas probables y las soluciones es crucial para una resolución eficiente.

### **5.1 Desajustes de Versión de Controladores y Software**

Un síntoma común es que la GPU no sea detectada por Docker (el comando docker run --gpus all nvidia-smi falla) o que Minikube no se inicie con errores relacionados con la GPU. La causa probable es que los controladores de NVIDIA para Windows estén desactualizados, el kernel de WSL2 no sea la última versión o Docker Desktop sea una versión anterior a la 4.31.1.1 Estos componentes forman una pila estrechamente acoplada, y una versión desactualizada de uno puede causar fallos en cascada.

Para resolver esto, se debe asegurar que el sistema operativo Windows esté completamente actualizado. También, se deben actualizar los controladores de GPU NVIDIA a la última versión estable desde el sitio web de NVIDIA, verificando que soporten la paravirtualización de GPU de WSL2.1 Es fundamental ejecutar wsl --update para obtener el último kernel de WSL2 2 y actualizar Docker Desktop a la última versión, específicamente la 4.31.1 o posterior, ya que las versiones anteriores pueden tener problemas de compatibilidad con los controladores NVIDIA recientes.4 La consistencia entre las versiones de Windows, WSL2, los controladores NVIDIA y Docker Desktop es vital, ya que estos componentes son interdependientes. Un nuevo controlador NVIDIA podría introducir cambios que requieran una versión más reciente de Docker Desktop, que a su vez depende de una versión específica del kernel de WSL2. Esto crea una reacción en cadena donde un componente desactualizado puede romper toda la tubería de aceleración de GPU.

### **5.2 Errores de Configuración de WSL2**

Si Docker Desktop informa que no hay acceso a la GPU, o si docker run --gpus all falla con "no GPUs available" incluso después de actualizar los controladores, el problema podría ser un error de configuración de WSL2. La causa probable es que el archivo .wslconfig no esté configurado correctamente (falta gpu=true bajo [wsl2]) o que WSL no se haya reiniciado correctamente después de la modificación.1

La solución consiste en verificar que el archivo .wslconfig exista en %UserProfile% (por ejemplo, C:UsersSuUsuario.wslconfig) y que contenga la línea exacta gpu=true bajo la sección [wsl2]. Después de verificarlo, se debe ejecutar wsl --shutdown desde PowerShell/CMD y luego reiniciar Docker Desktop o su distribución WSL para aplicar los cambios.1

### **5.3 Fallos de Inicio de Minikube o Problemas de Programación de Pods**

Si minikube start falla con errores relacionados con la GPU, o si los pods de Kubernetes que solicitan nvidia.com/gpu permanecen en estado Pending indefinidamente, la causa probable es que Minikube no se haya iniciado con las banderas --driver=docker y --gpus=all correctas, o que la configuración subyacente de GPU de Docker Desktop/WSL2 no sea funcional.6

Para solucionar esto, se debe asegurar que el comando minikube start incluya --driver=docker y --gpus=all (junto con otras banderas recomendadas como --memory y --cpus). Es fundamental volver a verificar el acceso a la GPU de Docker Desktop utilizando docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi como se describe en la Sección 2.2. Si este comando falla, se debe resolver primero el problema de Docker/WSL2, ya que Minikube depende de ello. También se puede verificar kubectl describe nodes minikube para ver si los recursos de GPU son anunciados por el nodo de Kubernetes. Si no es así, la configuración interna de Minikube para los plugins de dispositivos GPU podría ser un problema (aunque menos probable con las versiones recientes de Minikube).9

### **5.4 Consejos de Optimización del Rendimiento**

Para optimizar el rendimiento, se debe asignar suficientes recursos. Asegúrese de que su comando minikube start asigne suficiente --memory y --cpus a la máquina virtual de Minikube. Las cargas de trabajo de GPU suelen ser intensivas en CPU y memoria, y la insuficiencia de recursos puede generar cuellos de botella en el rendimiento, incluso si la GPU es accesible.6

Además, es recomendable monitorear el uso de la GPU. Utilice nvidia-smi dentro de sus contenedores acelerados por GPU (como se demostró en la Sección 4.2) para monitorear continuamente la utilización real de la GPU. Esto ayuda a identificar posibles cuellos de botella, subutilización o problemas con el código de su aplicación.

La siguiente tabla proporciona una guía de diagnóstico rápida para los usuarios que encuentren problemas, mapeando los síntomas comunes con sus causas probables y soluciones concisas.

**Tabla 2: Pasos Comunes para la Resolución de Problemas**

| Síntoma | Causa Probable | Solución/Comando |
| :---- | :---- | :---- |
| GPU no detectada por Docker (docker run --gpus all nvidia-smi falla) | Controladores NVIDIA de Windows, kernel de WSL2 o versión de Docker Desktop < 4.31.1 desactualizados; gpu=true en .wslconfig falta/es incorrecto; WSL no se reinició. | Actualizar todos los componentes (Windows, controladores NVIDIA, WSL2, Docker Desktop). Verificar .wslconfig y wsl --shutdown. |
| nvidia-smi no encontrado o errores en el contenedor (incluso si Docker detecta la GPU) | Imagen base incorrecta (no habilitada para CUDA, por ejemplo, ubuntu:latest en lugar de nvidia/cuda); controladores NVIDIA de Linux instalados en WSL2 (sobrescribiendo el "stub" libcuda.so). | Usar imágenes base nvidia/cuda para cargas de trabajo de GPU. **Crucialmente, desinstalar cualquier controlador NVIDIA de Linux de WSL2 si se instaló previamente, ya que entran en conflicto con el controlador paravirtualizado de Windows.** |
| Minikube falla al iniciarse con errores de GPU o los pods que solicitan GPU están Pending | Comando minikube start sin --driver=docker o --gpus=all; la configuración subyacente de GPU de Docker Desktop/WSL2 no funciona. | Asegurarse de usar las banderas correctas en minikube start. Volver a verificar el acceso a la GPU de Docker (Sección 2.2). Verificar kubectl describe nodes minikube para el anuncio de recursos de GPU. |
| Bajo rendimiento de GPU en los pods | CPU/memoria insuficiente asignada a la VM de Minikube; código de aplicación ineficiente o utilización incorrecta de la GPU. | Aumentar --memory y --cpus en el comando minikube start. Perfilar la aplicación para la utilización de GPU y optimizar el código. |

## **VII. Conclusión: Desatando el Poder de la GPU para el Desarrollo Local de Kubernetes**

A pesar de la ambigüedad inicial que el usuario encontró en la documentación oficial de Minikube, el análisis confirma que la combinación de Windows, WSL2 y Docker Desktop proporciona una ruta robusta y oficialmente soportada para la aceleración de GPU en su NVIDIA RTX 4050. La clave para superar la aparente contradicción reside en comprender que Minikube aprovecha las capacidades de GPU expuestas por Docker Desktop a través de la paravirtualización de WSL2, en lugar de gestionar directamente el hardware.

El éxito de esta configuración depende fundamentalmente de seguir las instrucciones detalladas paso a paso, con especial énfasis en la compatibilidad de los controladores y las versiones de software. La adherencia a las versiones más recientes y la realización de un proceso de validación por capas son críticas para una configuración estable y funcional. Este enfoque metódico, que incluye la verificación del acceso a la GPU en Docker antes de configurar Minikube y la inspección de los recursos de Kubernetes, permite una depuración eficiente y evita la pérdida de tiempo en diagnósticos erróneos.

En última instancia, esta capacidad empodera a los desarrolladores para construir, probar e iterar sobre aplicaciones aceleradas por GPU directamente en sus máquinas Windows, utilizando un entorno Kubernetes completamente funcional proporcionado por Minikube. Esto agiliza significativamente el flujo de trabajo de desarrollo para tareas de IA/ML, ciencia de datos y otras cargas de trabajo computacionalmente intensivas, cerrando la brecha entre el desarrollo local y las implementaciones nativas en la nube.

#### **Obras citadas**

1. Using GPU With Docker: A How-to Guide - DevZero, fecha de acceso: mayo 26, 2025, [https://www.devzero.io/blog/docker-gpu](https://www.devzero.io/blog/docker-gpu)  
2. GPU support | Docker Docs, fecha de acceso: mayo 26, 2025, [https://docs.docker.com/desktop/features/gpu/](https://docs.docker.com/desktop/features/gpu/)  
3. 1. NVIDIA GPU Accelerated Computing on WSL 2 — CUDA on WSL ..., fecha de acceso: mayo 26, 2025, [https://docs.nvidia.com/cuda/wsl-user-guide/index.html](https://docs.nvidia.com/cuda/wsl-user-guide/index.html)  
4. Windows WSL / Docker Desktop users must update to Docker Desktop v4.31.1, fecha de acceso: mayo 26, 2025, [https://forums.developer.nvidia.com/t/windows-wsl-docker-desktop-users-must-update-to-docker-desktop-v4-31-1/299421](https://forums.developer.nvidia.com/t/windows-wsl-docker-desktop-users-must-update-to-docker-desktop-v4-31-1/299421)  
5. Setup Minikube for GPU · GitHub, fecha de acceso: mayo 26, 2025, [https://gist.github.com/moficodes/15dea798c7ca603e6648b102d1c58b2c](https://gist.github.com/moficodes/15dea798c7ca603e6648b102d1c58b2c)  
6. Minikube Setup Guide — Dynamo - NVIDIA Docs Hub, fecha de acceso: mayo 26, 2025, [https://docs.nvidia.com/dynamo/latest/guides/dynamo_deploy/minikube.html](https://docs.nvidia.com/dynamo/latest/guides/dynamo_deploy/minikube.html)  
7. minikube/CHANGELOG.md at master · kubernetes/minikube · GitHub, fecha de acceso: mayo 26, 2025, [https://github.com/kubernetes/minikube/blob/master/CHANGELOG.md](https://github.com/kubernetes/minikube/blob/master/CHANGELOG.md)  
8. From WSL2/Ubuntu, how to configure minikube to use Docker Desktop driver?, fecha de acceso: mayo 26, 2025, [https://forums.docker.com/t/from-wsl2-ubuntu-how-to-configure-minikube-to-use-docker-desktop-driver/135028](https://forums.docker.com/t/from-wsl2-ubuntu-how-to-configure-minikube-to-use-docker-desktop-driver/135028)  
9. Tutorial: Setting Up a Kubernetes Environment with GPUs on Your GPU Server - vLLM Blog, fecha de acceso: mayo 26, 2025, [https://blog.vllm.ai/production-stack/tutorials/00-install-kubernetes-env.html](https://blog.vllm.ai/production-stack/tutorials/00-install-kubernetes-env.html)  
10. Installing Docker and The Docker Utility Engine for NVIDIA GPUs, fecha de acceso: mayo 26, 2025, [https://docs.nvidia.com/ai-enterprise/deployment/vmware/latest/docker.html](https://docs.nvidia.com/ai-enterprise/deployment/vmware/latest/docker.html)  
11. GPU container access - Podman Desktop, fecha de acceso: mayo 26, 2025, [https://podman-desktop.io/docs/podman/gpu](https://podman-desktop.io/docs/podman/gpu)  
12. Minikube start - Kubernetes, fecha de acceso: mayo 26, 2025, [https://minikube.sigs.k8s.io/docs/commands/start/](https://minikube.sigs.k8s.io/docs/commands/start/)  
13. kvm2 - Minikube - Kubernetes, fecha de acceso: mayo 26, 2025, [https://minikube.sigs.k8s.io/docs/drivers/kvm2/](https://minikube.sigs.k8s.io/docs/drivers/kvm2/)  
14. Spin up a single node GPU cluster with Minikube | Weights & Biases Documentation, fecha de acceso: mayo 26, 2025, [https://docs.wandb.ai/tutorials/minikube_gpu/](https://docs.wandb.ai/tutorials/minikube_gpu/)  
15. Device Plugins | Kubernetes, fecha de acceso: mayo 26, 2025, [https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)