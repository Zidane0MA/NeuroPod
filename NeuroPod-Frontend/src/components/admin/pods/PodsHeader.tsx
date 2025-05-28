import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Play, Infinity } from "lucide-react";
import { User } from "@/types/user";

interface PodsHeaderProps {
  user: User | null;
}

export const PodsHeader: React.FC<PodsHeaderProps> = ({ user }) => {
  // Para administradores, mostrar símbolo infinito
  const getBalanceDisplay = () => {
    if (user?.role === 'admin') {
      return (
        <div className="flex items-center gap-1 font-semibold text-primary">
          <Infinity className="h-4 w-4" />
          <span>€</span>
        </div>
      );
    }
    
    return (
      <div className="font-semibold">
        €{user?.balance?.toFixed(2) || '0.00'}
      </div>
    );
  };

  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Pods</h1>
        <p className="text-muted-foreground">Gestiona los contenedores desplegados</p>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-sm text-right">
          <div className="text-muted-foreground">Saldo</div>
          {getBalanceDisplay()}
        </div>
        
        <Link to="/admin/pods/deploy">
          <Button className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            <span>Deploy</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
