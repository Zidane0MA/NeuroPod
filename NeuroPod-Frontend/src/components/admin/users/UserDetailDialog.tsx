
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User } from "@/types/user";

interface UserDetailDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserDetailDialog = ({ user, open, onOpenChange }: UserDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalles del Usuario</DialogTitle>
        </DialogHeader>
        {user && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div className="break-words">{user.email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Nombre</div>
                <div>{user.name}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Fecha de Registro</div>
                <div>{user.registrationDate}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Pods</div>
                <div>{user.activePods}/{user.totalPods}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Saldo</div>
                <div>{user.balance.toFixed(2)} €</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Estado</div>
                <Badge variant={user.status === 'online' ? 'default' : 'secondary'}>
                  {user.status === 'online' ? 'Online' : 'Offline'}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
