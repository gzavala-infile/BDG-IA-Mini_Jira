import { create } from 'zustand';
import type { AuthUser } from '@mini-jira/shared';

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, accessToken });
  },

  setAccessToken: (token) => set({ accessToken: token }),

  clearAuth: () => {
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null });
  },

  isAdmin: () => get().user?.rol === 'admin',
}));
