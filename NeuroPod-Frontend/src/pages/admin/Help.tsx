
import React from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Server, Cpu, Users, HardDrive, Play, Terminal, ExternalLink } from "lucide-react";

const AdminHelp = () => {
  return (
    <DashboardLayout title="Ayuda">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Centro de Ayuda</h1>
        <p className="text-muted-foreground">Recursos y guías para la administración del sistema</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <Server className="h-6 w-6 text-primary mb-2" />
            <CardTitle>Gestión de Pods</CardTitle>
            <CardDescription>Guías para administrar contenedores</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader>
            <Users className="h-6 w-6 text-primary mb-2" />
            <CardTitle>Gestión de Usuarios</CardTitle>
            <CardDescription>Administración de cuentas y permisos</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader>
            <Cpu className="h-6 w-6 text-primary mb-2" />
            <CardTitle>Rendimiento</CardTitle>
            <CardDescription>Optimizar recursos del sistema</CardDescription>
          </CardHeader>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Guía Rápida: Contenedores</CardTitle>
          <CardDescription>Cómo iniciar y gestionar contenedores en el sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>¿Cómo desplegar un nuevo contenedor?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <p>Para desplegar un nuevo contenedor, sigue estos pasos:</p>
                  <ol className="list-decimal pl-4 space-y-2">
                    <li>Ve a la sección <strong>Pods</strong> en el panel lateral.</li>
                    <li>Haz clic en el botón <strong>Deploy</strong> en la esquina superior derecha.</li>
                    <li>Selecciona la GPU que deseas utilizar para el contenedor.</li>
                    <li>Configura los detalles del pod:</li>
                    <ul className="list-disc pl-8 space-y-1">
                      <li>Establece un nombre descriptivo</li>
                      <li>Selecciona la plantilla (Ubuntu o ComfyUI)</li>
                      <li>Configura los puertos necesarios</li>
                      <li>Ajusta el tamaño de almacenamiento</li>
                    </ul>
                    <li>Revisa el resumen y el coste estimado.</li>
                    <li>Haz clic en <strong>Start Deploy</strong> para iniciar el proceso.</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2">
              <AccordionTrigger>¿Cómo conectarse a un contenedor?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <p>Una vez que tienes un contenedor en ejecución, puedes conectarte de la siguiente manera:</p>
                  <ol className="list-decimal pl-4 space-y-2">
                    <li>En la lista de pods, encuentra el contenedor al que deseas conectarte.</li>
                    <li>Haz clic en el botón <strong>Connect</strong>.</li>
                    <li>Se abrirá un diálogo mostrando los puertos disponibles para la conexión.</li>
                    <li>Haz clic en <strong>Abrir</strong> junto al puerto que deseas utilizar.</li>
                    <li>Se abrirá una nueva pestaña del navegador conectada al servicio correspondiente.</li>
                  </ol>
                  <p className="text-sm text-muted-foreground">
                    <strong>Nota:</strong> Los puertos más comunes son:
                  </p>
                  <ul className="list-disc pl-8 space-y-1 text-sm text-muted-foreground">
                    <li>8888: Jupyter Notebook</li>
                    <li>7860: Interfaz Web para ComfyUI</li>
                    <li>22: SSH (requiere cliente SSH externo)</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger>¿Cómo gestionar los recursos de un contenedor?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <p>Para administrar eficientemente los recursos de un contenedor:</p>
                  <ol className="list-decimal pl-4 space-y-2">
                    <li>Monitoriza el uso de recursos en tiempo real desde la lista de pods.</li>
                    <li>Para contenedores que no están en uso, detén el pod para ahorrar recursos usando el botón <strong>Detener</strong>.</li>
                    <li>Si un contenedor está consumiendo demasiados recursos, puedes verificar sus logs para detectar problemas.</li>
                    <li>Para optimizar el rendimiento, evita ejecutar múltiples tareas intensivas en GPU simultáneamente en el mismo contenedor.</li>
                  </ol>
                  <p className="text-sm text-muted-foreground">
                    <strong>Recomendación:</strong> Configura el sistema para apagar automáticamente los pods inactivos en la sección de Configuración.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Preguntas Frecuentes</CardTitle>
          <CardDescription>Respuestas a las preguntas más comunes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="faq-1">
              <AccordionTrigger>¿Cómo puedo añadir más usuarios administradores?</AccordionTrigger>
              <AccordionContent>
                <p>Para añadir más usuarios administradores, ve a la sección de Usuarios, busca o crea el usuario que deseas promover, y en las opciones de ese usuario selecciona "Ver detalle". Dentro de los detalles, encontrarás la opción para cambiar su rol a Administrador.</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="faq-2">
              <AccordionTrigger>¿Qué hacer si un contenedor no responde?</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Primero, revisa los logs del contenedor para identificar posibles errores.</li>
                  <li>Intenta detener y reiniciar el contenedor usando los botones correspondientes.</li>
                  <li>Si el problema persiste, considera eliminar el contenedor y crear uno nuevo.</li>
                  <li>En caso de problemas recurrentes, verifica los recursos del sistema en la sección de Dashboard.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="faq-3">
              <AccordionTrigger>¿Cómo crear plantillas personalizadas para pods?</AccordionTrigger>
              <AccordionContent>
                <p>Para crear plantillas personalizadas:</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Ve a la sección de Configuración {'>'}  Plantillas.</li>
                  <li>Haz clic en "Crear" para iniciar el proceso de creación de una nueva plantilla.</li>
                  <li>Define la imagen base y los paquetes que deseas preinstalar.</li>
                  <li>Configura los puertos por defecto y otras configuraciones específicas.</li>
                  <li>Guarda la plantilla con un nombre descriptivo para que esté disponible al crear nuevos pods.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="faq-4">
              <AccordionTrigger>¿Cómo funciona el sistema de facturación?</AccordionTrigger>
              <AccordionContent>
                <p>El sistema de facturación funciona de la siguiente manera:</p>
                <ul className="list-disc pl-4 space-y-2">
                  <li>Los usuarios pagan por el tiempo de uso de los recursos (por hora).</li>
                  <li>Los costos incluyen: uso de GPU, almacenamiento temporal (Container Disk) y almacenamiento persistente (Volume Disk).</li>
                  <li>Los precios pueden configurarse en la sección de Configuración {'>'}  Precios y Cuotas.</li>
                  <li>Los administradores tienen saldo ilimitado para pruebas y desarrollo.</li>
                  <li>Los informes de facturación están disponibles en la sección de Dashboard para revisión.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminHelp;
