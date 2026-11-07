import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id: string;
  phoneNumber: string;
  role: 'SUPER_ADMIN' | 'COORDINATEUR' | 'BGE';
  name: string | null;
}

interface AdminAuthState {
  adminToken: string | null;
  admin: AdminUser | null;
  setAdminAuth: (token: string, admin: AdminUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isSuperAdmin: () => boolean;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      adminToken: null,
      admin: null,

      setAdminAuth: (adminToken, admin) => {
        set({ adminToken, admin });
      },

      logout: () => {
        set({ adminToken: null, admin: null });
      },

      isAuthenticated: () => {
        return !!get().adminToken;
      },

      isSuperAdmin: () => {
        const { admin } = get();
        return admin?.role === 'SUPER_ADMIN';
      },
    }),
    {
      name: 'neochat-admin-auth',
    }
  )
);