'use client';

import { useRouter } from 'next/navigation';
import { Shield, Megaphone, Bot } from 'lucide-react';
import { useAdminAuthStore } from '@/store/adminStore';
import { Button } from '@/components/ui/button';
import AnnoncesSection from './annonces-section';
import GeminiSection from './gemini-section';

export default function DashboardUAUBEN() {
  const router = useRouter();
  const { adminToken, admin, logout } = useAdminAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/uauben-login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-uauben.png" alt="UAUBEN" className="h-8" />
            <div>
              <h1 className="font-semibold text-slate-900">UAUBEN</h1>
              <p className="text-xs text-slate-500">Portail secrétariat</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {admin?.name || admin?.phoneNumber}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section C : Import Gemini */}
          <GeminiSection adminToken={adminToken} />
          {/* Section B : Annonces express */}
          <AnnoncesSection adminToken={adminToken} />
        </div>
      </main>
    </div>
  );
}