
'use client';

import type { Metadata } from 'next';
import { Montserrat, Roboto_Flex } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { DataProvider } from '@/context/DataContext';

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
    <html lang="vi" className={`${roboto_flex.variable} ${montserrat.variable}`}>
      <body className="font-body antialiased">
        <DataProvider>
            {children}
            <Toaster />
        </DataProvider>
      </body>
    </html>
  );
}
