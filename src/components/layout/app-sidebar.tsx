'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  FileCheck2,
  Home,
  ShieldCheck,
  Users,
  Book,
  GanttChartSquare,
  Bot,
  FileText,
  Settings,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const adminNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { href: '/admin/users', icon: Users, label: 'Quản lý Người dùng' },
  { href: '/admin/criteria', icon: FileCheck2, label: 'Quản lý Tiêu chí' },
  { href: '/admin/reviews', icon: GanttChartSquare, label: 'Duyệt Đánh giá', badge: '6' },
  { href: '/admin/reports', icon: FileText, label: 'Báo cáo & Thống kê' },
  { href: '/ai-assistant', icon: Bot, label: 'Trợ lý AI' },
  { href: '/documents', icon: Book, label: 'Văn bản Hướng dẫn' },
];

const communeNavItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
    { href: '/commune/assessments', icon: FileCheck2, label: 'Tự Chấm điểm' },
    { href: '/documents', icon: Book, label: 'Văn bản Hướng dẫn' },
];

export default function AppSidebar() {
  const pathname = usePathname();
  // In a real app, you'd get this from user context
  const userRole = 'admin'; 
  const navItems = userRole === 'admin' ? adminNavItems : communeNavItems;

  return (
    <div className="hidden border-r bg-card md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-headline">Legal Access</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  pathname.startsWith(item.href) && item.href !== '/dashboard' ? 'bg-muted text-primary' : '',
                  pathname === item.href && item.href === '/dashboard' ? 'bg-muted text-primary' : ''
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.badge && (
                  <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <nav className='grid items-start text-sm font-medium'>
             <Link
                href="/profile"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  pathname === "/profile" && 'bg-muted text-primary'
                )}
              >
                <Settings className="h-4 w-4" />
                Hồ sơ & Cài đặt
              </Link>
              <Link
                href="/"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-destructive transition-all hover:text-primary"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
