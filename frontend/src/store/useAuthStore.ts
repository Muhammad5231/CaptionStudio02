import { create } from 'zustand';
import type { User, TokenResponse } from '../types/caption';

const TOKEN_KEY = 'captionstudio_token';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';

  // Actions
  setAuthModalOpen: (open: boolean, tab?: 'login' | 'register') => void;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  login: (formData: FormData | { username: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; full_name?: string }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<User | null>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  isLoading: false,
  isAuthModalOpen: false,
  authModalTab: 'login',

  setAuthModalOpen: (open, tab = 'login') => {
    set({ isAuthModalOpen: open, authModalTab: tab });
  },

  setToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      set({ token, isAuthenticated: true });
    } else {
      localStorage.removeItem(TOKEN_KEY);
      set({ token: null, isAuthenticated: false, user: null });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  login: async (formData) => {
    set({ isLoading: true });
    try {
      const body = formData instanceof FormData
        ? formData
        : new URLSearchParams({
            username: formData.username,
            password: formData.password,
          });

      const headers: Record<string, string> = {};
      if (!(formData instanceof FormData)) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers,
        body,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
        throw new Error(err.detail || 'Authentication failed');
      }

      const data: TokenResponse = await res.json();
      localStorage.setItem(TOKEN_KEY, data.access_token);
      set({
        token: data.access_token,
        user: data.user,
        isAuthenticated: true,
        isAuthModalOpen: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async ({ email, password, full_name }) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(err.detail || 'Registration failed');
      }

      const data: TokenResponse = await res.json();
      localStorage.setItem(TOKEN_KEY, data.access_token);
      set({
        token: data.access_token,
        user: data.user,
        isAuthenticated: true,
        isAuthModalOpen: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  fetchMe: async () => {
    const token = get().token || localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ user: null, isAuthenticated: false });
      return null;
    }

    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const user: User = await res.json();
        set({ user, isAuthenticated: true });
        return user;
      } else if (res.status === 401) {
        // Token expired or invalid
        get().logout();
        return null;
      }
      return null;
    } catch (e) {
      console.warn('Failed to verify session token:', e);
      return null;
    }
  },

  initAuth: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      set({ token, isAuthenticated: true });
      await get().fetchMe();
    }
  },
}));

