import { User } from '../types/user';

export const MOCK_USERS: User[] = [
  {
    id: 'usr-101',
    employeeId: 'EMP101',
    name: 'Surya',
    email: 'surya@resolvehub.com',
    role: 'Supporter',
    phone: '+91 98765 43210',
    accountStatus: 'Active',
    avatarUrl: ''
  },
  {
    id: 'usr-102',
    employeeId: 'EMP102',
    name: 'Ravi',
    email: 'ravi@resolvehub.com',
    role: 'Supporter',
    phone: '+91 98765 43211',
    accountStatus: 'Active',
    avatarUrl: ''
  },
  {
    id: 'usr-205',
    employeeId: 'EMP205',
    name: 'Arun',
    email: 'arun@resolvehub.com',
    role: 'Developer',
    phone: '+91 98765 43212',
    accountStatus: 'Active',
    avatarUrl: ''
  }
];

export const DEFAULT_SUPPORTER = MOCK_USERS[0];

