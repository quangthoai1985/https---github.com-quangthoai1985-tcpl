
'use client';
import AppHeader from '@/components/layout/app-header';
import AppSidebar from '@/components/layout/app-sidebar';
import { useData } from '@/context/DataContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = useData();
  const router = useRouter();

  useEffect(() => {
    // A simple check to redirect if no role is set (e.g., page refresh on a protected route)
    // In a real app, you'd have a more robust auth check.
    if (!role) {
      router.push('/');
    }
  }, [role, router]);


  return (
     <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <AppHeader />
      <div className="flex flex-1">
        <div className="hidden md:block">
            <AppSidebar />
        </div>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
