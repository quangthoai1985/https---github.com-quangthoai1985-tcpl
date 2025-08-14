
'use client';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { DataProvider } from '@/context/DataContext';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

// Metadata can't be in a client component, so we export it separately.
// We will handle metadata in a separate file if needed or a parent server component.
/*
export const metadata: Metadata = {
  title: 'Legal Access Tracker',
  description: 'Ứng dụng quản lý đánh giá, công nhận cấp xã đạt chuẩn tiếp cận pháp luật',
};
*/


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="font-body antialiased">
        <DataProvider>
            {children}
            <Toaster />
        </DataProvider>
      </body>
    </html>
  );
}
