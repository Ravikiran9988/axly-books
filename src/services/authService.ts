import { ReaderUser, AuthState } from '@/types/user';
import { progressService } from '@/services/progressService';

type AuthListener = (state: AuthState) => void;

class AuthService {
  private listeners: Set<AuthListener> = new Set();
  private currentUser: ReaderUser | null = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.checkSession();
    }
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener({ isAuthenticated: Boolean(this.currentUser), user: this.currentUser });

    if (!this.isInitialized && typeof window !== 'undefined') {
      this.checkSession();
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state: AuthState = {
      isAuthenticated: Boolean(this.currentUser),
      user: this.currentUser,
    };
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  }

  public async checkSession(): Promise<ReaderUser | null> {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        this.currentUser = data.user || null;
        if (this.currentUser) await progressService.syncFromServer(this.currentUser.id);
      } else {
        this.currentUser = null;
      }
    } catch {
      // In case of network disconnection or offline
      this.currentUser = null;
    } finally {
      this.isInitialized = true;
      this.notify();
    }
    return this.currentUser;
  }

  public getAuthState(): AuthState {
    return {
      isAuthenticated: Boolean(this.currentUser),
      user: this.currentUser,
    };
  }

  public async register(
    displayName: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: ReaderUser }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password, agreeTerms: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed.' };
      }

      this.currentUser = data.user;
      await progressService.syncFromServer(data.user.id);
      this.notify();
      return { success: true, user: data.user };
    } catch {
      return {
        success: false,
        error: 'Network connection failed. Please check your internet connection.',
      };
    }
  }

  public async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: ReaderUser }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid email or password.' };
      }

      this.currentUser = data.user;
      await progressService.syncFromServer(data.user.id);
      this.notify();
      return { success: true, user: data.user };
    } catch {
      return {
        success: false,
        error: 'Network connection failed. Please check your internet connection.',
      };
    }
  }

  public async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      progressService.clearForLogout();
      this.currentUser = null;
      this.notify();
    }
  }

  public async requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to request reset.' };
      }

      return {
        success: true,
        message: data.message || 'Password recovery instructions have been sent.',
      };
    } catch {
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }
}

export const authService = new AuthService();
