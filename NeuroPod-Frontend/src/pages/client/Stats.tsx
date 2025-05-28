
import React from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, Cpu, Server } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const ClientStats = () => {
  return (
    <DashboardLayout title="Estadísticas">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Estadísticas</h1>
        <p className="text-muted-foreground">Rendimiento y uso de tus recursos</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pods Creados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">3</div>
              <Server className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pods Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">1</div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CPU Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">25%</div>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dinero Gastado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">6.25 €</div>
              <Server className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rendimiento del Sistema</CardTitle>
            <CardDescription>Uso de recursos durante las últimas 24 horas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center bg-muted/20 rounded-md">
              <div className="flex flex-col items-center text-muted-foreground">
                <BarChart3 className="h-10 w-10 mb-2" />
                <p>Gráfico de rendimiento (Placeholder)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logs del Último Pod</CardTitle>
            <CardDescription>ComfyUI-1</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black rounded-md p-4 h-[200px] text-white font-mono text-sm overflow-auto">
              <p className="text-green-400">[System] <span className="text-white">Iniciando contenedor...</span></p>
              <p className="text-blue-400">[Info] <span className="text-white">Cargando dependencias</span></p>
              <p className="text-blue-400">[Info] <span className="text-white">Iniciando servidor web en puerto 7860</span></p>
              <p className="text-green-400">[System] <span className="text-white">Servidor iniciado correctamente</span></p>
              <p className="text-blue-400">[Info] <span className="text-white">Modelo cargado: sd_xl_base_1.0.safetensors</span></p>
              <p className="text-yellow-400">[Warning] <span className="text-white">Uso de VRAM al 80%</span></p>
              <p className="text-blue-400">[Info] <span className="text-white">Generación completada: imagen_001.png</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Uso de Recursos por Pod</CardTitle>
          <CardDescription>Estado actual de tus pods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  <h3 className="font-medium">ComfyUI-1 <span className="text-sm text-green-500 font-normal">(Activo)</span></h3>
                </div>
                <span className="text-sm text-muted-foreground">2h 15m de tiempo activo</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU</span>
                    <span>25%</span>
                  </div>
                  <Progress value={25} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memoria</span>
                    <span>4.2GB / 8GB</span>
                  </div>
                  <Progress value={52.5} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>GPU</span>
                    <span>65%</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  <h3 className="font-medium">Ubuntu-Dev <span className="text-sm text-gray-500 font-normal">(Inactivo)</span></h3>
                </div>
                <span className="text-sm text-muted-foreground">Sin actividad</span>
              </div>
              
              <div className="flex justify-center py-6 text-muted-foreground">
                Pod detenido. No hay datos disponibles.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default ClientStats;
