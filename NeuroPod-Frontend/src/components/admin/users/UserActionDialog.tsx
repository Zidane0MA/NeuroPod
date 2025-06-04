
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@/types/user";

interface UserActionDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  isBalanceAction?: boolean;
  onBalanceAssign?: (userId: string, balance: number) => void;
}

export const UserActionDialog = ({ 
  user, 
  open, 
  onOpenChange,
  title,
  description,
  actionLabel,
  onAction,
  isBalanceAction = false,
  onBalanceAssign
}: UserActionDialogProps) => {
  // Función para obtener el balance inicial de forma segura
  const getInitialBalance = (userBalance: number | null | 'Infinity'): number => {
    if (userBalance === null || userBalance === undefined) return 0;
    if (userBalance === 'Infinity' || userBalance === Infinity || !isFinite(Number(userBalance))) return 0;
    return Number(userBalance);
  };
  
  const [balance, setBalance] = useState<number>(getInitialBalance(user?.balance));

  // Actualizar balance cuando cambie el usuario
  useEffect(() => {
    setBalance(getInitialBalance(user?.balance));
  }, [user]);

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setBalance(value);
    }
  };

  const handleAction = () => {
    if (isBalanceAction && onBalanceAssign && user) {
      onBalanceAssign(user.id, balance);
    } else {
      onAction();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        {user && (
          <div className="py-4">
            <p><strong>Usuario:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            {isBalanceAction && (
              <div className="mt-4">
                <Label htmlFor="balance">Asignar Saldo (€)</Label>
                <Input
                  id="balance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={balance}
                  onChange={handleBalanceChange}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        )}
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button 
            variant={isBalanceAction ? "default" : "destructive"} 
            onClick={handleAction} 
            className="w-full sm:w-auto"
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
