import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { UsersSearch } from "@/components/admin/users/UsersSearch";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { UserActionDialog } from "@/components/admin/users/UserActionDialog";
import { mockUsers, USERS_PER_PAGE } from "@/data/mockUsers";
import { User } from "@/types/user";
import { toast } from "sonner";

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActivePods, setFilterActivePods] = useState(false);
  const [filterOnline, setFilterOnline] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogType, setDialogType] = useState<'suspend' | 'delete' | 'balance' | null>(null);
  const [visibleUsers, setVisibleUsers] = useState(USERS_PER_PAGE);

  // Nuevo: función para filtrar usuarios según los filtros activos
  const filterUsers = (baseUsers: User[], activePods: boolean, online: boolean) => {
    let filtered = baseUsers;
    if (activePods) {
      filtered = filtered.filter(user => user.activePods > 0);
    }
    if (online) {
      filtered = filtered.filter(user => user.status === 'online');
    }
    return filtered;
  };

  // Buscar solo por nombre/email, y limpiar filtros
  const handleSearch = () => {
    let filtered = mockUsers;
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    // Al buscar, limpiar filtros
    setFilterActivePods(false);
    setFilterOnline(false);
    setUsers(filtered);
  };

  // Cuando cambian los filtros, aplicar filtrado independiente
  React.useEffect(() => {
    if (!filterActivePods && !filterOnline) {
      setUsers(mockUsers);
      return;
    }
    setUsers(filterUsers(mockUsers, filterActivePods, filterOnline));
  }, [filterActivePods, filterOnline]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterActivePods(false);
    setFilterOnline(false);
    setUsers(mockUsers);
  };

  const loadMore = () => {
    setVisibleUsers(prev => prev + USERS_PER_PAGE);
  };

  const openSuspendDialog = (user: User) => {
    setSelectedUser(user);
    setDialogType('suspend');
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDialogType('delete');
  };

  const openBalanceDialog = (user: User) => {
    setSelectedUser(user);
    setDialogType('balance');
  };

  const closeDialog = () => {
    setDialogType(null);
    setSelectedUser(null);
  };

  const assignBalance = (userId: string, balance: number) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, balance } : user
      )
    );
    toast.success("Saldo asignado correctamente");
    closeDialog();
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Usuarios</h1>
        <p className="text-muted-foreground">Gestiona los usuarios del sistema</p>
      </div>

      <UsersSearch
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterActivePods={filterActivePods}
        setFilterActivePods={setFilterActivePods}
        filterOnline={filterOnline}
        setFilterOnline={setFilterOnline}
        handleSearch={handleSearch}
        clearFilters={clearFilters}
      />

      <UsersTable
        users={users}
        visibleUsers={visibleUsers}
        loadMore={loadMore}
        openSuspendDialog={openSuspendDialog}
        openDeleteDialog={openDeleteDialog}
        openBalanceDialog={openBalanceDialog}
      />

      <UserActionDialog
        user={selectedUser}
        open={dialogType === 'suspend'}
        onOpenChange={() => dialogType === 'suspend' && closeDialog()}
        title="Suspender Usuario"
        description="¿Estás seguro de que quieres suspender a este usuario? Sus pods serán detenidos."
        actionLabel="Suspender Usuario"
        onAction={closeDialog}
      />

      <UserActionDialog
        user={selectedUser}
        open={dialogType === 'delete'}
        onOpenChange={() => dialogType === 'delete' && closeDialog()}
        title="Eliminar Usuario"
        description="¿Estás seguro de que quieres eliminar a este usuario? Esta acción no se puede deshacer."
        actionLabel="Eliminar Usuario"
        onAction={closeDialog}
      />

      <UserActionDialog
        user={selectedUser}
        open={dialogType === 'balance'}
        onOpenChange={() => dialogType === 'balance' && closeDialog()}
        title="Asignar Saldo"
        description="Introduce el saldo para este usuario."
        actionLabel="Asignar Saldo"
        isBalanceAction={true}
        onBalanceAssign={assignBalance}
        onAction={() => {}}
      />
    </DashboardLayout>
  );
};

export default AdminUsers;
