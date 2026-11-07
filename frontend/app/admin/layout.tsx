'use client';

import AdminRoute from '@/components/AdminRoute';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Gift, Shield } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: '/admin/users',
      label: 'Utilisateurs',
      icon: Users,
    },
    {
      href: '/admin/affiliates',
      label: 'Ambassadeurs',
      icon: Gift,
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <AdminRoute>
      <div className="min-h-screen bg-slate-50">
        {/* Header Admin */}
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-red-600 to-orange-600 text-white z-50 shadow-lg">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6" />
              <div>
                <h1 className="text-xl font-bold">Administration NeoChat</h1>
                <p className="text-xs text-red-100">Panneau de contrôle</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex pt-[72px]">
          {/* Sidebar */}
          <aside className="fixed left-0 top-[72px] bottom-0 w-64 bg-white border-r border-slate-200 overflow-y-auto">
            <nav className="p-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      active
                        ? 'bg-gradient-to-r from-red-50 to-orange-50 text-red-600 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-red-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Footer Sidebar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-slate-50">
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                ← Retour au Dashboard
              </Link>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 ml-64 p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminRoute>
  );
}
