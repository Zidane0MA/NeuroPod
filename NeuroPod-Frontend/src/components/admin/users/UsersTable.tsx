
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
  openUserDetail: (user: User) => void;
  openSuspendDialog: (user: User) => void;
  openDeleteDialog: (user: User) => void;
  openSalaryDialog: (user: User) => void;
}

export const UsersTable = ({
  users,
  visibleUsers,
  loadMore,
  openUserDetail,
  openSuspendDialog,
  openDeleteDialog,
  openSalaryDialog
}: UsersTableProps) => {
  const isMobile = useIsMobile();
  
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
              {!isMobile && <TableHead>Salario</TableHead>}
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
                {!isMobile && <TableCell>{user.balance.toFixed(2)} €</TableCell>}
                {!isMobile && (
                  <TableCell>
                    {user.salary !== undefined ? `${user.salary.toFixed(2)} €` : 'No asignado'}
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant={user.status === 'online' ? 'default' : 'secondary'}>
                    {user.status === 'online' ? 'Online' : 'Offline'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openUserDetail(user)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openSalaryDialog(user)}>
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
