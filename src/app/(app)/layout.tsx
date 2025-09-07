
'use client';
import AppHeader from '@/components/layout/app-header';
import AppSidebar from '@/components/layout/app-sidebar';
import { useData } from '@/context/DataContext';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/');
    }
  }, [currentUser, loading, router]);
  
  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState) {
      setIsSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prevState => {
      const newState = !prevState;
      localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
      return newState;
    });
  };

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
        <AppHeader />
        <div className="flex">
            <AppSidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
            <main 
                className="flex-1 transition-all duration-300 ease-in-out"
                style={{ marginLeft: isSidebarCollapsed ? '60px' : '250px' }}
            >
                 <AnimatePresence mode="wait">
                    <motion.div
                        key={pathname}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                            {children}
                        </div>
                    </motion.div>
                 </AnimatePresence>
            </main>
        </div>
    </div>
  ) : null;
}
