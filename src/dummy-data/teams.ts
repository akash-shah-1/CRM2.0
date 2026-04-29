import { UserRole } from '../types/auth';

export const TEAM_MEMBERS_DATA = [
  { id: '1', name: 'Sarah Chen', email: 'sarah@nexus.com', role: UserRole.ADMIN, status: 'online', department: 'Engineering' },
  { id: '2', name: 'Alex Rivier', email: 'alex@nexus.com', role: UserRole.MANAGER, status: 'offline', department: 'Operations' },
  { id: '3', name: 'Maria Garcia', email: 'maria@nexus.com', role: UserRole.EMPLOYEE, status: 'online', department: 'Design' },
  { id: '4', name: 'James Wilson', email: 'james@nexus.com', role: UserRole.EMPLOYEE, status: 'away', department: 'Legal' },
  { id: '5', name: 'Elena Popova', email: 'elena@nexus.com', role: UserRole.MANAGER, status: 'online', department: 'Product' },
];
