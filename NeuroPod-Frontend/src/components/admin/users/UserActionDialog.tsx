
import React, { useState } from "react";
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
  isSalaryAction?: boolean;
  onSalaryAssign?: (userId: string, salary: number) => void;
}

export const UserActionDialog = ({ 
  user, 
  open, 
  onOpenChange,
  title,
  description,
  actionLabel,
  onAction,
  isSalaryAction = false,
  onSalaryAssign
}: UserActionDialogProps) => {
  const [salary, setSalary] = useState<number>(user?.salary || 0);

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setSalary(value);
    }
  };

  const handleAction = () => {
    if (isSalaryAction && onSalaryAssign && user) {
      onSalaryAssign(user.id, salary);
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
            {isSalaryAction && (
              <div className="mt-4">
                <Label htmlFor="salary">Asignar Salario (€)</Label>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={salary}
                  onChange={handleSalaryChange}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        )}
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button 
            variant={isSalaryAction ? "default" : "destructive"} 
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
