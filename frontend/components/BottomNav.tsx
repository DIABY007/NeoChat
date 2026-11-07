'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CreditCard,
  UserCircle
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/billing', label: 'Facturation', icon: CreditCard },
  { href: '/profile', label: 'Profil', icon: UserCircle },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 z-50 pb-6">
      <div className="grid grid-cols-3 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 h-full flex flex-col items-center justify-center active:scale-95 transition-transform"
            >
              {isActive ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-1.5 px-4 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                  </div>
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-500">
                    {item.label}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {item.label}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
