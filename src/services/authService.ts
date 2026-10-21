import { ReaderUser, AuthState } from '@/types/user';

const AUTH_STORAGE_KEY = 'axly_reader_auth';
const USERS_STORAGE_KEY = 'axly_registered_users';

type AuthListener = (state: AuthState) => void;

class AuthService {
  private listeners: Set<AuthListener> = new Set();

  constructor() {
    // initialize storage listeners on window
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === AUTH_STORAGE_KEY) {
          this.notify();
        }
      });
    }
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    // immediately call with current state
    listener(this.getAuthState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getAuthState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  }

  public getAuthState(): AuthState {
    if (typeof window === 'undefined') {
      return { isAuthenticated: false, user: null };
    }

    try {
      const data = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!data) return { isAuthenticated: false, user: null };
      const user = JSON.parse(data) as ReaderUser;
      return { isAuthenticated: true, user };
    } catch {
      return { isAuthenticated: false, user: null };
    }
  }

  public async register(
    displayName: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: ReaderUser }> {
    // Simulate brief network latency for realistic UX
    await new Promise((resolve) => setTimeout(resolve, 400));

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = displayName.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Display name must be at least 2 characters long.' };
    }
    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    if (typeof window === 'undefined') {
      return { success: false, error: 'Window not available' };
    }

    // Check existing mock users
    const existingRaw = localStorage.getItem(USERS_STORAGE_KEY);
    const existingUsers: Array<{ email: string; name: string; passwordHash: string }> = existingRaw
      ? JSON.parse(existingRaw)
      : [];

    if (existingUsers.some((u) => u.email === trimmedEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Note: In Phase 1 frontend mock, passwords are simulated and never stored in plain-text in real production.
    // In Phase 2, this endpoint will call the production auth API.
    const newUser: ReaderUser = {
      id: `usr-${Date.now()}`,
      displayName: trimmedName,
      email: trimmedEmail,
      createdAt: new Date().toISOString(),
    };

    existingUsers.push({
      email: trimmedEmail,
      name: trimmedName,
      passwordHash: `mock-hash-${btoa(password).slice(0, 10)}`,
    });

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(existingUsers));
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));

    this.notify();
    return { success: true, user: newUser };
  }

  public async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: ReaderUser }> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    if (typeof window === 'undefined') {
      return { success: false, error: 'Window not available' };
    }

    const existingRaw = localStorage.getItem(USERS_STORAGE_KEY);
    const existingUsers: Array<{ email: string; name: string; passwordHash: string }> = existingRaw
      ? JSON.parse(existingRaw)
      : [];

    const found = existingUsers.find((u) => u.email === trimmedEmail);

    // If no existing user found in localStorage, create one automatically for dev testing
    const user: ReaderUser = found
      ? {
          id: `usr-${trimmedEmail.replace(/[^a-zA-Z0-9]/g, '')}`,
          displayName: found.name,
          email: found.email,
          createdAt: new Date().toISOString(),
        }
      : {
          id: `usr-${trimmedEmail.replace(/[^a-zA-Z0-9]/g, '')}`,
          displayName: trimmedEmail.split('@')[0],
          email: trimmedEmail,
          createdAt: new Date().toISOString(),
        };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    this.notify();
    return { success: true, user };
  }

  public logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      this.notify();
    }
  }

  public async requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    return {
      success: true,
      message: `A password reset link has been dispatched to ${trimmedEmail} (Simulated for Phase 1).`,
    };
  }
}

export const authService = new AuthService();
