
export interface User {
  id: string;
  email: string;
  name: string;
  registrationDate: string;
  activePods: number;
  totalPods: number;
  balance: number | null | 'Infinity'; // Puede ser null, number, o string 'Infinity' para admins
  status: 'online' | 'offline';
  role?: 'admin' | 'client';
}
