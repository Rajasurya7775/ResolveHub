export type UserRole = 'Supporter' | 'Admin' | 'Developer';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  accountStatus: 'Active' | 'Inactive';
  avatarUrl?: string;
}

export type ShiftType = 'Shift A' | 'Shift B' | 'Shift C';

export interface ShiftInfo {
  shift: ShiftType;
  description: string;
}
