'use client';

import { Montserrat, Roboto_Flex, Oswald, Roboto_Condensed } from 'next/font/google';
import './globals.css';

// ✅ SỬA LỖI TẠI ĐÂY: Đổi 'sonner' thành 'toaster'
import { Toaster } from "@/components/ui/toaster"; 

import { DataProvider } from '@/context/DataContext';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';

// Khai báo các font chữ bạn muốn sử dụng
const roboto_flex = Roboto_Flex({
  subsets: ['latin', 'vietnamese'],
  weight: '400',
  display: 'swap',
  variable: '--font-roboto-flex',
});

const montserrat = Montserrat({
    subsets: ['latin', 'vietnamese'],
    weight: '400',
    variable: '--font-montserrat',
    display: 'swap',
});

const oswald = Oswald({
    subsets: ['latin', 'vietnamese'],
    weight: '500',
    variable: '--font-oswald',
    display: 'swap',
});

const roboto_condensed = Roboto_Condensed({
    subsets: ['latin', 'vietnamese'],
    weight: '400',
    variable: '--font-roboto-condensed',
    display: 'swap',
});

// Component RootLayout DUY NHẤT VÀ HOÀN CHỈNH
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${roboto_flex.variable} ${montserrat.variable} ${oswald.variable} ${roboto_condensed.variable}`}>
      <body className="font-body antialiased">
        <DataProvider>
          <PageTransitionWrapper>
            {children}
          </PageTransitionWrapper>
          <Toaster />
        </DataProvider>
      </body>
    </html>
  );
}