
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Book,
  FileCheck2,
  GanttChartSquare,
  FileText,
  LayoutDashboard,
  Building,
  CalendarClock,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useData } from '@/context/DataContext';

const adminNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { href: '/admin/users', icon: Users, label: 'Quản lý Người dùng' },
  { href: '/admin/units', icon: Building, label: 'Quản lý Đơn vị' },
  { href: '/admin/criteria', icon: FileCheck2, label: 'Quản lý Tiêu chí' },
  { href: '/admin/assessment-periods', icon: CalendarClock, label: 'Quản lý Đợt đánh giá' },
  { href: '/admin/reviews', icon: GanttChartSquare, label: 'Duyệt Đánh giá' },
  { href: '/admin/reports', icon: FileText, label: 'Báo cáo & Thống kê' },
  { href: '/documents', icon: Book, label: 'Văn bản Hướng dẫn' },
];

const communeNavItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
    { href: '/commune/assessments', icon: FileCheck2, label: 'Tự Chấm điểm' },
    { href: '/documents', icon: Book, label: 'Văn bản Hướng dẫn' },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { role, notifications } = useData();
  const navItems = role === 'admin' ? adminNavItems : communeNavItems;
  const pendingCount = role === 'admin' ? notifications.filter(n => n.link.startsWith('/admin/reviews')).length : 0;

  return (
    <aside className="border-r bg-background w-full md:w-[250px] lg:w-[250px]">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex-1 py-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  pathname === item.href ? 'bg-muted text-primary' : 
                  (pathname.startsWith(item.href) && item.href !== '/dashboard') ? 'bg-muted text-primary' : ''
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.href === '/admin/reviews' && pendingCount > 0 && role === 'admin' && (
                  <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    {pendingCount}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
