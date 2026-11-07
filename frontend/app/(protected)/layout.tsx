'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import BottomNav from '@/components/BottomNav';
import TopBar from '@/components/TopBar';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <TopBar />
        <main className="pt-16 pb-24 px-4 max-w-7xl mx-auto">
          {children}
        </main>
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
