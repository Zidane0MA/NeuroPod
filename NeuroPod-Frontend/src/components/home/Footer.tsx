
import React from "react";
import { Container } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Container className="h-5 w-5 text-purple-500" />
              <span className="text-lg font-bold">NeuroPod</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Plataforma web escalable para gestionar contenedores de forma remota.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-4">Plataforma</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/features" className="text-muted-foreground hover:text-foreground">
                  Características
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground">
                  Precios
                </Link>
              </li>
              <li>
                <a href="https://github.com/Zidane0MA/NeuroPod" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                  Documentación
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-4">Recursos</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-foreground">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/tutorials" className="text-muted-foreground hover:text-foreground">
                  Tutoriales
                </Link>
              </li>
              <li>
                <Link to="/api" className="text-muted-foreground hover:text-foreground">
                  API
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground">
                  Términos
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} NeuroPod. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
