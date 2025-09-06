
'use client';
import AppHeader from '@/components/layout/app-header';
import AppSidebar from '@/components/layout/app-sidebar';
import { useData } from '@/context/DataContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading } = useData();
  const router = useRouter();
  const pathname = usePathname();

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
    <div className="flex min-h-screen w-full bg-muted/40">
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          className="flex flex-1"
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Sidebar will be sticky and not part of the main scrolling area */}
          <motion.div
            variants={{
              initial: { x: -100, opacity: 0 },
              animate: { x: 0, opacity: 1 },
              exit: { x: -100, opacity: 0 },
            }}
            className="sticky top-0 h-screen" // Make sidebar sticky
          >
            <AppSidebar />
          </motion.div>

          {/* This div will contain the header and main content, and will be scrollable */}
          <div className="flex flex-1 flex-col overflow-y-auto">
              <motion.div
                  variants={{
                  initial: { y: -100, opacity: 0 },
                  animate: { y: 0, opacity: 1 },
                  exit: { y: -100, opacity: 0 },
                  }}
              >
                  <AppHeader />
              </motion.div>

              <motion.main
                  variants={{
                  initial: { x: 100, opacity: 0 },
                  animate: { x: 0, opacity: 1 },
                  exit: { x: 100, opacity: 0 },
                  }}
                  className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6"
              >
                  {children}
              </motion.main>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  ) : null;
}
