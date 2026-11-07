'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { LogOut, User, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

const ADMIN_PHONE = process.env.NEXT_PUBLIC_ADMIN_PHONE;

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Déconnexion réussie');
    router.push('/register');
  };

  if (!mounted) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse"></div>
            <div>
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-40">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Image
            src="/logo-neochat.svg"
            alt="Logo NeoChat - Automatisation WhatsApp avec IA"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              NeoChat
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {Boolean(ADMIN_PHONE && user?.phone === ADMIN_PHONE) && (
            <Link
              href="/admin"
              className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 hover:shadow-lg transition-all hover:scale-105"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </Link>
          )}
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </div>
  );
}
