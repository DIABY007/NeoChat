import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  phone: string;
  lastName: string | null;
  referralCode: string;
  referredBy: string | null;
  walletBalance: number;
  paymentName?: string;
  paymentPhone?: string;
  paymentMethod?: string;
  paymentOtherMethod?: string;
  preferredCountry?: string;
  referralCount?: number;
  monthlyEarnings?: number;
  totalEarnings?: number;
}

interface Subscription {
  status: 'TRIAL' | 'DIFFUSION' | 'ASSISTANT' | 'PREMIUM' | 'EXPIRED' | 'ACTIVE' | 'BIG_FISH';
  messageCount: number;
  trialEndsAt: string | null;
  nextBillingAt: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  subscription: Subscription | null;
  setAuth: (token: string, user: User, subscription: Subscription) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      subscription: null,
      
      setAuth: (token, user, subscription) => {
        set({ token, user, subscription });
      },
      
      updateUser: (updatedUser) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updatedUser } });
        }
      },
      
      logout: () => {
        set({ token: null, user: null, subscription: null });
      },
      
      isAuthenticated: () => {
        return !!get().token;
      },
    }),
    {
      name: 'neochat-auth',
    }
  )
);
