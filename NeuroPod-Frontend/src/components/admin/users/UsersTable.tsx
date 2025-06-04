
import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, UserX, Trash2, DollarSign } from "lucide-react";
import { User } from "@/types/user";
import { useIsMobile } from "@/hooks/use-mobile";

interface UsersTableProps {
  users: User[];
  visibleUsers: number;
  loadMore: () => void;
  openSuspendDialog: (user: User) => void;
  openDeleteDialog: (user: User) => void;
  openBalanceDialog: (user: User) => void;
}

export const UsersTable = ({
  users,
  visibleUsers,
  loadMore,
  openSuspendDialog,
  openDeleteDialog,
  openBalanceDialog
}: UsersTableProps) => {
  const isMobile = useIsMobile();
  
  // Función para formatear el balance de manera segura
  const formatBalance = (balance: number | null | 'Infinity') => {
    if (balance === null || balance === undefined) {
      return '0.00 €';
    }
    if (balance === 'Infinity' || balance === Infinity || !isFinite(Number(balance))) {
      return '∞ €';
    }
    return `${Number(balance).toFixed(2)} €`;
  };
  
  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={isMobile ? "w-[180px]" : ""}>Email</TableHead>
              <TableHead>Nombre</TableHead>
              {!isMobile && <TableHead>Registro</TableHead>}
              <TableHead>Pods</TableHead>
              {!isMobile && <TableHead>Saldo</TableHead>}
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.slice(0, visibleUsers).map((user) => (
              <TableRow key={user.id}>
                <TableCell className="max-w-[180px] truncate">{user.email}</TableCell>
                <TableCell>{user.name}</TableCell>
                {!isMobile && <TableCell>{user.registrationDate}</TableCell>}
                <TableCell>{user.activePods}/{user.totalPods}</TableCell>
                {!isMobile && <TableCell>{formatBalance(user.balance)}</TableCell>}
                <TableCell>
                  <Badge variant={user.status === 'online' ? 'default' : 'secondary'}>
                    {user.status === 'online' ? 'Online' : 'Offline'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openBalanceDialog(user)}>
                      <DollarSign className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openSuspendDialog(user)}>
                      <UserX className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(user)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {visibleUsers < users.length && (
        <div className="flex justify-center p-4 border-t">
          <Button variant="outline" onClick={loadMore}>Cargar Más</Button>
        </div>
      )}
    </div>
  );
};
