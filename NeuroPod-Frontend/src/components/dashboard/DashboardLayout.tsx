
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { 
  Container, 
  Home, 
  Server, 
  ChevronDown, 
  Settings, 
  Users, 
  HelpCircle, 
  LogOut, 
  Database, 
  Activity, 
  AreaChart,
  Menu,
  FileBox
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type NavItem = {
  title: string;
  icon: React.ElementType;
  href: string;
  active?: boolean;
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title = "Dashboard" }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminNavItems: NavItem[] = [
    {
      title: "Dashboard",
      icon: Home,
      href: "/dashboard",
      active: window.location.pathname === "/dashboard",
    },
    {
      title: "Pods",
      icon: Server,
      href: "/admin/pods",
      active: window.location.pathname.includes("/admin/pods"),
    },
    {
      title: "Plantillas",
      icon: FileBox,
      href: "/admin/templates",
      active: window.location.pathname === "/admin/templates",
    },
    {
      title: "Usuarios",
      icon: Users,
      href: "/admin/users",
      active: window.location.pathname === "/admin/users",
    },
    {
      title: "Configuración",
      icon: Settings,
      href: "/admin/settings",
      active: window.location.pathname === "/admin/settings",
    },
    {
      title: "Ayuda",
      icon: HelpCircle,
      href: "/admin/help",
      active: window.location.pathname === "/admin/help",
    },
  ];

  const clientNavItems: NavItem[] = [
    {
      title: "Home",
      icon: Home,
      href: "/dashboard",
      active: window.location.pathname === "/dashboard",
    },
    {
      title: "Estadísticas",
      icon: AreaChart,
      href: "/client/stats",
      active: window.location.pathname === "/client/stats",
    },
    {
      title: "Pods",
      icon: Server,
      href: "/client/pods",
      active: window.location.pathname.includes("/client/pods"),
    },
    {
      title: "Configuración",
      icon: Settings,
      href: "/client/settings",
      active: window.location.pathname === "/client/settings",
    },
    {
      title: "Ayuda",
      icon: HelpCircle,
      href: "/client/help",
      active: window.location.pathname === "/client/help",
    },
  ];

  const navItems = isAdmin ? adminNavItems : clientNavItems;

  // Sidebar for desktop
  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <Container className="h-5 w-5 text-purple-500" />
          <span className="font-bold text-xl">NeuroPod</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((route) => (
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
        <div className="p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{user?.name}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Saldo</span>
            <span className="font-semibold">
              {typeof user?.balance === 'number' && user.balance === Infinity 
                ? '∞ €' 
                : `${user?.balance?.toFixed(2) || 0} €`
              }
            </span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-border bg-card fixed h-full z-30">
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild className="md:hidden fixed top-4 left-4 z-50">
          <Button variant="outline" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col md:ml-64">
        <main className="flex-1 overflow-x-hidden p-6 pt-16 md:pt-6">
          <div className="container max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
