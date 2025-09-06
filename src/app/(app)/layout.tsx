
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
    if (!loading && !currentUser) {
      router.push('/');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>Đang tải dữ liệu...</span>
      </div>
    );
  }

  return currentUser ? (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <motion.div
            variants={{
              initial: { y: -100, opacity: 0 },
              animate: { y: 0, opacity: 1 },
              exit: { y: -100, opacity: 0 },
            }}
          >
            <AppHeader />
          </motion.div>

          <div className="flex">
            <motion.div
              className="sticky top-0 h-screen"
              variants={{
                initial: { x: -100, opacity: 0 },
                animate: { x: 0, opacity: 1 },
                exit: { x: -100, opacity: 0 },
              }}
            >
              <AppSidebar />
            </motion.div>

            <motion.main
              className="flex-1"
              variants={{
                initial: { x: 100, opacity: 0 },
                animate: { x: 0, opacity: 1 },
                exit: { x: 100, opacity: 0 },
              }}
            >
                 <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    {children}
                </div>
            </motion.main>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  ) : null;
}
