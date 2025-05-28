
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Container } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <Container className="h-16 w-16 text-purple-500 mb-4" />
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Oops! La página que buscas no existe.</p>
      <Button asChild>
        <Link to="/">Volver al Inicio</Link>
      </Button>
    </div>
  );
};

export default NotFound;
