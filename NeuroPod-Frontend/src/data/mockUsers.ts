
import { User } from "@/types/user";

export const USERS_PER_PAGE = 20;

export const mockUsers: User[] = Array.from({ length: 50 }).map((_, i) => {
  const isAdmin = i === 0;
  const isClientWithNoBalance = Math.random() < 0.1; // 10% chance de tener balance null
  
  return {
    id: `user-${i+1}`,
    email: isAdmin ? "admin@example.com" : `usuario${i+1}@example.com`,
    name: isAdmin ? "Admin" : `Usuario ${i+1}`,
    registrationDate: new Date(Date.now() - Math.random() * 10000000000).toLocaleDateString(),
    activePods: Math.floor(Math.random() * 3),
    totalPods: Math.floor(Math.random() * 5) + 1,
    balance: isAdmin ? 'Infinity' : (isClientWithNoBalance ? null : parseFloat((Math.random() * 100).toFixed(2))),
    status: Math.random() > 0.3 ? 'offline' : 'online' as 'online' | 'offline',
    role: isAdmin ? 'admin' : 'client'
  };
});
