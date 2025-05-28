
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Server, Play } from "lucide-react";

export const EmptyPodsList: React.FC = () => {
  return (
    <div className="text-center py-10">
      <Server className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-xl font-medium mb-2">No tienes pods desplegados</h3>
      <p className="text-muted-foreground mb-6">Despliega tu primer pod con GPU para comenzar</p>
      <Link to="/client/pods/deploy">
        <Button className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          <span>Deploy un pod</span>
        </Button>
      </Link>
    </div>
  );
};
