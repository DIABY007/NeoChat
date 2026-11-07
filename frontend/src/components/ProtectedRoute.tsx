'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { analytics } from '@/lib/analytics';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { token, user, subscription } = useAuthStore();
  const identifiedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mounted && !isChecking && !token) {
      router.push('/login');
    }
  }, [mounted, isChecking, token, router]);

  useEffect(() => {
    if (user && subscription && !identifiedRef.current) {
      identifiedRef.current = true;
      analytics.identifyUser({
        id: user.id,
        phone: user.phone,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        walletBalance: user.walletBalance,
        subscription: { status: subscription.status },
      });
    }
  }, [user, subscription]);

  if (!mounted || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Vérification...</p>
        </div>
      </div>
    );
  }

  if (!token || !user || !subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement de vos données...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
