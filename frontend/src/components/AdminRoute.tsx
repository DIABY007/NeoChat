'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ADMIN_PHONE = process.env.NEXT_PUBLIC_ADMIN_PHONE;

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  
  const isAuthorized = Boolean(ADMIN_PHONE && user?.phone === ADMIN_PHONE);
  
  useEffect(() => {
    if (!user || !isAuthorized) {
      router.push('/dashboard');
    }
  }, [user, isAuthorized, router]);
  
  if (!user || !isAuthorized) {
    return null;
  }
  
  return <>{children}</>;
}
