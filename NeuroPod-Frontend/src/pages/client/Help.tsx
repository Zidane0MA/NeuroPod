
import React from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Server, Play, Terminal, ExternalLink } from "lucide-react";

const ClientHelp = () => {
  return (
    <DashboardLayout title="Ayuda">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Centro de Ayuda</h1>
        <p className="text-muted-foreground">Guías y recursos para utilizar la plataforma</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Guía de Inicio Rápido</CardTitle>
          <CardDescription>Aprende a utilizar la plataforma en minutos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Play className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">1. Despliega tu contenedor</h3>
                <p className="text-muted-foreground">
                  Ve a la sección de "Pods" y haz clic en el botón "Deploy". Selecciona la GPU que deseas utilizar
                  y configura los parámetros de tu contenedor como nombre, plantilla y almacenamiento.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Server className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">2. Gestiona tus recursos</h3>
                <p className="text-muted-foreground">
                  Una vez desplegado tu contenedor, puedes gestionarlo desde la sección "Pods". Podrás iniciar,
                  detener y monitorizar el uso de recursos en tiempo real.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <ExternalLink className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">3. Conéctate a tu contenedor</h3>
                <p className="text-muted-foreground">
                  Utiliza el botón "Connect" para acceder a tu contenedor a través de los puertos configurados.
                  Podrás acceder a interfaces web como Jupyter Notebook o ComfyUI directamente desde tu navegador.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Terminal className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">4. Consulta los logs</h3>
                <p className="text-muted-foreground">
                  Si encuentras algún problema, puedes revisar los logs de tu contenedor haciendo clic en el botón
                  "Logs". Esto te permitirá diagnosticar y resolver problemas rápidamente.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preguntas Frecuentes</CardTitle>
          <CardDescription>Respuestas a las preguntas más comunes</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>¿Cómo funciona el sistema de facturación?</AccordionTrigger>
              <AccordionContent>
                <p>
                  El sistema de facturación se basa en el tiempo de uso de los recursos. Solo pagas por el tiempo
                  que tus pods están activos. Los costos incluyen:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Uso de GPU: Depende del modelo seleccionado</li>
                  <li>Container Disk: Para almacenamiento temporal (0.05€/GB/hora)</li>
                  <li>Volume Disk: Para datos persistentes (0.1€/GB/hora)</li>
                </ul>
                <p className="mt-2">
                  Para ahorrar costos, te recomendamos detener tus pods cuando no los estés utilizando activamente.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>¿Qué plantillas están disponibles?</AccordionTrigger>
              <AccordionContent>
                <p>Actualmente ofrecemos dos plantillas principales:</p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>
                    <strong>Ubuntu:</strong> Sistema operativo base con soporte para CUDA, ideal para desarrollar
                    tus propias soluciones.
                  </li>
                  <li>
                    <strong>ComfyUI:</strong> Entorno preconfigurado para generación de imágenes con IA, incluye
                    todas las dependencias necesarias y acceso web a través del puerto 7860.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>¿Cómo puedo acceder a Jupyter Notebook?</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Asegúrate de que tu pod está en ejecución.</li>
                  <li>Haz clic en el botón "Connect" junto a tu pod.</li>
                  <li>
                    En el diálogo que aparece, haz clic en "Abrir" junto al puerto 8888 (el puerto estándar de Jupyter).
                  </li>
                  <li>
                    Se abrirá una nueva pestaña con la interfaz de Jupyter Notebook. La primera vez que te conectes, es posible
                    que necesites introducir un token de acceso que puedes encontrar en los logs del pod.
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>¿Mis datos son persistentes?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Cada pod tiene dos tipos de almacenamiento:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>
                    <strong>Container Disk:</strong> Almacenamiento temporal que se borra cuando el pod se elimina.
                    Ideal para archivos temporales y caché.
                  </li>
                  <li>
                    <strong>Volume Disk:</strong> Almacenamiento persistente que se mantiene incluso si el pod se elimina.
                    Debes usar este almacenamiento para guardar tus datos importantes.
                  </li>
                </ul>
                <p className="mt-2">
                  Te recomendamos guardar regularmente tus datos importantes en el Volume Disk y considerar
                  hacer copias de seguridad externas de tus datos más críticos.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>¿Qué hago si mi pod no responde?</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Revisa los logs del pod para identificar posibles errores.</li>
                  <li>Intenta detener y reiniciar el pod usando los botones correspondientes.</li>
                  <li>
                    Si el problema persiste, puedes eliminar el pod y crear uno nuevo. Recuerda que si utilizaste
                    el Volume Disk, tus datos importantes estarán a salvo.
                  </li>
                  <li>
                    Si continúas teniendo problemas, contacta con soporte a través de la sección de ayuda.
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default ClientHelp;
