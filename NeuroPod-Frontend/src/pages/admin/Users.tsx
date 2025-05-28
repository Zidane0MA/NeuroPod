import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { UsersSearch } from "@/components/admin/users/UsersSearch";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { UserDetailDialog } from "@/components/admin/users/UserDetailDialog";
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
  const [dialogType, setDialogType] = useState<'detail' | 'suspend' | 'delete' | 'salary' | null>(null);
  const [visibleUsers, setVisibleUsers] = useState(USERS_PER_PAGE);

  const handleSearch = () => {
    let filtered = mockUsers;
    
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterActivePods) {
      filtered = filtered.filter(user => user.activePods > 0);
    }
    
    if (filterOnline) {
      filtered = filtered.filter(user => user.status === 'online');
    }
    
    setUsers(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterActivePods(false);
    setFilterOnline(false);
    setUsers(mockUsers);
  };

  const loadMore = () => {
    setVisibleUsers(prev => prev + USERS_PER_PAGE);
  };

  const openUserDetail = (user: User) => {
    setSelectedUser(user);
    setDialogType('detail');
  };

  const openSuspendDialog = (user: User) => {
    setSelectedUser(user);
    setDialogType('suspend');
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDialogType('delete');
  };

  const openSalaryDialog = (user: User) => {
    setSelectedUser(user);
    setDialogType('salary');
  };

  const closeDialog = () => {
    setDialogType(null);
    setSelectedUser(null);
  };

  const assignSalary = (userId: string, salary: number) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId ? { ...user, salary } : user
      )
    );
    toast.success("Salario asignado correctamente");
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
        openUserDetail={openUserDetail}
        openSuspendDialog={openSuspendDialog}
        openDeleteDialog={openDeleteDialog}
        openSalaryDialog={openSalaryDialog}
      />

      <UserDetailDialog 
        user={selectedUser} 
        open={dialogType === 'detail'} 
        onOpenChange={() => dialogType === 'detail' && closeDialog()} 
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
        open={dialogType === 'salary'}
        onOpenChange={() => dialogType === 'salary' && closeDialog()}
        title="Asignar Salario"
        description="Introduce el salario mensual para este usuario."
        actionLabel="Asignar Salario"
        isSalaryAction={true}
        onSalaryAssign={assignSalary}
        onAction={() => {}}
      />
    </DashboardLayout>
  );
};

export default AdminUsers;
