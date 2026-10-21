export interface ReaderUser {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: ReaderUser | null;
}
