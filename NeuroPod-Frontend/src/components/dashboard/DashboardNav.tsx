
import React from "react";
import { Link } from "react-router-dom";
import { Container, Home, Server, Image, Settings, Users, Database, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DashboardNav = () => {
  const routes = [
    {
      title: "Dashboard",
      icon: Home,
      href: "/dashboard",
      active: true,
    },
    {
      title: "Instancias",
      icon: Server,
      href: "/dashboard/instances",
      active: false,
    },
    {
      title: "Galería",
      icon: Image,
      href: "/dashboard/gallery",
      active: false,
    },
    {
      title: "Usuarios",
      icon: Users,
      href: "/dashboard/users",
      active: false,
    },
    {
      title: "Base de Datos",
      icon: Database,
      href: "/dashboard/database",
      active: false,
    },
    {
      title: "Actividad",
      icon: Activity,
      href: "/dashboard/activity",
      active: false,
    },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen fixed">
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <Container className="h-5 w-5 text-purple-500" />
          <span className="font-bold text-xl">NeuroPod</span>
        </Link>
      </div>
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {routes.map((route) => (
            <Button
              key={route.href}
              variant={route.active ? "default" : "ghost"}
              className={cn(
                "w-full justify-start",
                route.active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              asChild
            >
              <Link to={route.href}>
                <route.icon className="mr-2 h-4 w-4" />
                {route.title}
              </Link>
            </Button>
          ))}
        </div>
      </nav>
      <div className="p-4 border-t border-border">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link to="/dashboard/settings">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </Link>
        </Button>
      </div>
    </div>
  );
};
