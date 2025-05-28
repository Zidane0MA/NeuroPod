
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Activity, BarChart3, Cpu, Server, Users, DollarSign, Terminal, Settings, HelpCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const AdminDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bienvenido, {user?.name}</h1>
        <p className="text-muted-foreground">Panel de administración de NeuroPod</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pods Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">42</div>
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
              <div className="text-2xl font-bold">18</div>
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
              <div className="text-2xl font-bold">37%</div>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">15</div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganancias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">387 €</div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle>Logs del Sistema</CardTitle>
            <CardDescription>Problemas recientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black rounded-md p-4 h-[200px] text-white font-mono text-sm overflow-auto">
              <p className="text-green-400">[System] <span className="text-white">Iniciando servidor...</span></p>
              <p className="text-yellow-400">[Warning] <span className="text-white">Uso de GPU por encima del 80%</span></p>
              <p className="text-red-400">[Error] <span className="text-white">Pod-15 se detuvo inesperadamente</span></p>
              <p className="text-blue-400">[Info] <span className="text-white">Nuevo usuario registrado: maria@example.com</span></p>
              <p className="text-green-400">[System] <span className="text-white">Backup completado correctamente</span></p>
              <p className="text-yellow-400">[Warning] <span className="text-white">Almacenamiento al 75% de capacidad</span></p>
              <p className="text-blue-400">[Info] <span className="text-white">Pod-23 desplegado correctamente</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Acciones Rápidas</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/admin/pods">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <Server className="h-6 w-6 mb-2 text-primary" />
              <CardTitle>Gestionar Pods</CardTitle>
              <CardDescription>
                Administra los contenedores desplegados en el sistema
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/users">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <Users className="h-6 w-6 mb-2 text-primary" />
              <CardTitle>Gestionar Usuarios</CardTitle>
              <CardDescription>
                Administra los usuarios y sus permisos
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/settings">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <Settings className="h-6 w-6 mb-2 text-primary" />
              <CardTitle>Configuración</CardTitle>
              <CardDescription>
                Ajusta la configuración del sistema
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </>
  );

  const ClientDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bienvenido a NeuroPod, {user?.name}</h1>
        <p className="text-muted-foreground">Tu plataforma para desplegar contenedores con potencia GPU</p>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Guía Rápida</CardTitle>
          <CardDescription>
            Sigue estos pasos para comenzar a usar NeuroPod
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">1. Despliega tu primer pod</h3>
              <p className="text-muted-foreground">
                Ve a la sección de Pods y haz clic en "Deploy" para crear tu primer contenedor.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <Terminal className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">2. Conéctate a tu pod</h3>
              <p className="text-muted-foreground">
                Una vez desplegado, usa el botón "Connect" para acceder a tu contenedor.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <Cpu className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">3. Utiliza los recursos</h3>
              <p className="text-muted-foreground">
                Aprovecha la potencia GPU para ejecutar tus cargas de trabajo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Acciones Rápidas</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/client/pods">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <Server className="h-6 w-6 mb-2 text-primary" />
              <CardTitle>Gestionar Pods</CardTitle>
              <CardDescription>
                Administra tus contenedores
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/client/stats">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <Activity className="h-6 w-6 mb-2 text-primary" />
              <CardTitle>Ver Estadísticas</CardTitle>
              <CardDescription>
                Revisa el rendimiento de tus pods
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/client/help">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <HelpCircle className="h-6 w-6 mb-2 text-primary" />
              <CardTitle>Ayuda</CardTitle>
              <CardDescription>
                Consulta las guías de uso
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </>
  );

  return (
    <DashboardLayout title="Dashboard">
      {isAdmin ? <AdminDashboard /> : <ClientDashboard />}
    </DashboardLayout>
  );
};

export default Dashboard;
