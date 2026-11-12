export type UserRole = 'Support' | 'Supporter' | 'Developer';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  roleType?: string;
  phone?: string;
  accountStatus: 'Active' | 'Inactive';
  avatarUrl?: string;
}

export interface SignupFormData {
  employee_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  password: string;
  role_type: string;
  role: UserRole | string;
}

export type ShiftType = 'Shift A' | 'Shift B' | 'Shift C';

export interface ShiftInfo {
  shift: ShiftType;
  description: string;
}
