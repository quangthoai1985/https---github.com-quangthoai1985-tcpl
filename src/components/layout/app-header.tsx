
'use client';

import Link from 'next/link';
import {
  Bell,
  Home,
  LogOut,
  Menu,
  Package2,
  Search,
  Settings,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { usePathname } from 'next/navigation';
import AppSidebar from './app-sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export default function AppHeader() {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname.startsWith('/admin/reviews/')) {
        return 'Chi tiết Hồ sơ Đánh giá';
    }
    switch (pathname) {
      case '/dashboard':
        return 'Tổng quan';
      case '/admin/users':
        return 'Quản lý Người dùng';
      case '/admin/units':
        return 'Quản lý Đơn vị';
      case '/admin/criteria':
        return 'Quản lý Tiêu chí';
      case '/admin/reviews':
        return 'Duyệt Hồ sơ Đánh giá';
      case '/admin/reports':
        return 'Báo cáo & Thống kê';
      case '/commune/assessments':
        return 'Tự Chấm điểm';
      case '/documents':
        return 'Văn bản Hướng dẫn';
      case '/profile':
        return 'Hồ sơ cá nhân';
      default:
        return 'Legal Access Tracker';
    }
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Mở menu điều hướng</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <AppSidebar />
        </SheetContent>
      </Sheet>
      <div className="w-full flex-1">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          {getPageTitle()}
        </h1>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Avatar>
                <AvatarImage src="https://placehold.co/100x100.png" alt="Admin" data-ai-hint="user avatar" />
                <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <span className="sr-only">Mở menu người dùng</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/profile" className='flex items-center gap-2'><Settings className='h-4 w-4' />Hồ sơ</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/" className='flex items-center gap-2'><LogOut className='h-4 w-4' />Đăng xuất</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
