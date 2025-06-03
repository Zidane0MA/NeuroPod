import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { UsersSearch } from "@/components/admin/users/UsersSearch";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { UserActionDialog } from "@/components/admin/users/UserActionDialog";
import { mockUsers, USERS_PER_PAGE } from "@/data/mockUsers";
import { userService } from "@/services/user.service";
import { User } from "@/types/user";
import { toast } from "sonner";

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Para mantener la lista completa
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActivePods, setFilterActivePods] = useState(false);
  const [filterOnline, setFilterOnline] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogType, setDialogType] = useState<'suspend' | 'delete' | 'balance' | null>(null);
  const [visibleUsers, setVisibleUsers] = useState(USERS_PER_PAGE);

  // Cargar usuarios al inicializar el componente
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const fetchedUsers = await userService.getAllUsers();
        setAllUsers(fetchedUsers);
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
        toast.error("Error al cargar usuarios. Usando datos simulados.");
        // Fallback a datos simulados en caso de error
        setAllUsers(mockUsers);
        setUsers(mockUsers);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Función para filtrar usuarios según los filtros activos
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
  const handleSearch = async () => {
    try {
      setLoading(true);
      let filtered = allUsers;
      
      if (searchTerm.trim()) {
        // Intentar usar búsqueda del backend si está disponible
        try {
          filtered = await userService.searchUsers(searchTerm);
        } catch (error) {
          // Fallback a búsqueda local
          filtered = allUsers.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
      }
      
      // Al buscar, limpiar filtros
      setFilterActivePods(false);
      setFilterOnline(false);
      setUsers(filtered);
    } catch (error) {
      console.error('Error en búsqueda:', error);
      toast.error("Error en la búsqueda");
    } finally {
      setLoading(false);
    }
  };

  // Cuando cambian los filtros, aplicar filtrado independiente
  useEffect(() => {
    if (!filterActivePods && !filterOnline) {
      setUsers(allUsers);
      return;
    }
    setUsers(filterUsers(allUsers, filterActivePods, filterOnline));
  }, [filterActivePods, filterOnline, allUsers]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterActivePods(false);
    setFilterOnline(false);
    setUsers(allUsers);
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

  const assignBalance = async (userId: string, balance: number) => {
    try {
      await userService.updateUserBalance(userId, balance);
      
      // Actualizar usuario en la lista local
      const updateUserInList = (usersList: User[]) =>
        usersList.map(user =>
          user.id === userId ? { ...user, balance } : user
        );
      
      setUsers(updateUserInList);
      setAllUsers(updateUserInList);
      
      toast.success("Saldo asignado correctamente");
      closeDialog();
    } catch (error) {
      console.error('Error al asignar saldo:', error);
      toast.error("Error al asignar saldo");
    }
  };

  const suspendUser = async () => {
    if (!selectedUser) return;
    
    try {
      await userService.suspendUser(selectedUser.id);
      
      // Actualizar usuario en la lista local (marcar como suspendido/offline)
      const updateUserInList = (usersList: User[]) =>
        usersList.map(user =>
          user.id === selectedUser.id 
            ? { ...user, status: 'offline' as const, activePods: 0 } 
            : user
        );
      
      setUsers(updateUserInList);
      setAllUsers(updateUserInList);
      
      toast.success("Usuario suspendido correctamente");
      closeDialog();
    } catch (error) {
      console.error('Error al suspender usuario:', error);
      toast.error("Error al suspender usuario");
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await userService.deleteUser(selectedUser.id);
      
      // Eliminar usuario de las listas locales
      const filterUser = (usersList: User[]) =>
        usersList.filter(user => user.id !== selectedUser.id);
      
      setUsers(filterUser);
      setAllUsers(filterUser);
      
      toast.success("Usuario eliminado correctamente");
      closeDialog();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      toast.error("Error al eliminar usuario");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Usuarios</h1>
          <p className="text-muted-foreground">Gestiona los usuarios del sistema</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Cargando usuarios...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Usuarios</h1>
        <p className="text-muted-foreground">
          Gestiona los usuarios del sistema ({users.length} usuarios)
        </p>
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
        onAction={suspendUser}
      />

      <UserActionDialog
        user={selectedUser}
        open={dialogType === 'delete'}
        onOpenChange={() => dialogType === 'delete' && closeDialog()}
        title="Eliminar Usuario"
        description="¿Estás seguro de que quieres eliminar a este usuario? Esta acción no se puede deshacer."
        actionLabel="Eliminar Usuario"
        onAction={deleteUser}
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
