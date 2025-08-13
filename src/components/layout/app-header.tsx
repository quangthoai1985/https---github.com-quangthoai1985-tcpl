
'use client';

import Link from 'next/link';
import {
  Bell,
  LogOut,
  Menu,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  FileUp,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { usePathname } from 'next/navigation';
import AppSidebar from './app-sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useData } from '@/context/DataContext';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { adminNotifications, communeNotifications } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

export default function AppHeader() {
  const pathname = usePathname();
  const { role } = useData();
  const notifications = role === 'admin' ? adminNotifications : communeNotifications;
  const unreadNotifications = notifications.filter(n => !n.read).length;


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
      case '/admin/assessment-periods':
        return 'Quản lý Đợt đánh giá';
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
  
  const getAvatarFallback = () => {
    return role === 'admin' ? 'AD' : 'CB';
  }
  
  const getAvatarAlt = () => {
    return role === 'admin' ? 'Admin' : 'Cán bộ';
  }

  const notificationIcons: {[key: string]: React.ReactNode} = {
      'đã được duyệt': <CheckCircle2 className="h-4 w-4 text-green-500" />,
      'bị từ chối': <XCircle className="h-4 w-4 text-red-500" />,
      'chờ duyệt': <Clock className="h-4 w-4 text-yellow-500" />,
      'đã gửi': <FileUp className="h-4 w-4 text-primary" />,
  }

  const getNotificationIcon = (title: string) => {
      if (title.includes('đã được duyệt')) return notificationIcons['đã được duyệt'];
      if (title.includes('bị từ chối')) return notificationIcons['bị từ chối'];
      if (title.includes('vừa gửi')) return notificationIcons['đã gửi'];
      return notificationIcons['chờ duyệt'];
  }

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

       <Popover>
          <PopoverTrigger asChild>
             <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {unreadNotifications}
                    </span>
                )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="p-4">
                <h4 className="font-medium leading-none">Thông báo</h4>
                <p className="text-sm text-muted-foreground">Bạn có {unreadNotifications} thông báo mới.</p>
            </div>
            <Separator />
            <div className="p-2 max-h-80 overflow-y-auto">
                {notifications.map(notification => (
                    <div key={notification.id} className={cn(
                        "mb-1 flex items-start gap-4 rounded-lg p-3 text-sm transition-colors hover:bg-muted/50",
                        !notification.read && "bg-blue-50/50"
                    )}>
                        <div className="mt-1">
                           {getNotificationIcon(notification.title)}
                        </div>
                        <div className="flex-1">
                            <p className="leading-snug">{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.time}</p>
                        </div>
                    </div>
                ))}
            </div>
            <Separator />
            <div className="p-2">
                <Button variant="link" size="sm" className="w-full">Xem tất cả thông báo</Button>
            </div>
          </PopoverContent>
        </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Avatar>
                <AvatarImage src="https://placehold.co/100x100.png" alt={getAvatarAlt()} data-ai-hint="user avatar" />
                <AvatarFallback className={cn('bg-primary text-primary-foreground', role === 'commune' && 'bg-muted-foreground' )}>{getAvatarFallback()}</AvatarFallback>
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
