export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee'
}

export interface UserProfile {
  id: string; // Satisfies DataTable constraint
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  status?: 'active' | 'disabled';
  permissions?: string[]; // List of module IDs the user can see
  projectAccess?: string[]; // IDs of projects the user is allowed to access
  fcmTokens?: string[]; // Device tokens for push notifications
  createdAt: any;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}
