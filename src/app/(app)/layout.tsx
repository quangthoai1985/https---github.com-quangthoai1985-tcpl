
'use client';
import AppHeader from '@/components/layout/app-header';
import AppSidebar from '@/components/layout/app-sidebar';
import { useData } from '@/context/DataContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading } = useData();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not loading and no user is found.
    if (!loading && !currentUser) {
      router.push('/');
    } else if (!loading && currentUser) {
      // Optional: if user is logged in and tries to access a page they shouldn't, redirect.
      // For now, we assume they should be on a page under /app.
      // If the current path is the root login page, push them to dashboard.
      if (window.location.pathname === '/') {
        router.push('/dashboard');
      }
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>Đang tải dữ liệu...</span>
      </div>
    );
  }

  // Render the layout only if there is a user
  return currentUser ? (
     <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <AppHeader />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  ) : null; // or a fallback component if you prefer
}
