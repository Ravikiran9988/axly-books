export type UserRole = 'admin' | 'reader';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type ReaderUser = UserProfile;

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
}

