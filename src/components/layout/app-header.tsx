
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
  Shield,
  User,
  HelpCircle,
  Paintbrush,
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
import AppSidebar from './app-sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useData } from '@/context/DataContext';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AppHeader() {
  const { role, currentUser, units, logout, notifications, markNotificationAsRead } = useData();
  const router = useRouter();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const unreadNotifications = notifications.filter(n => !n.read).length;
  
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleNotificationClick = (notificationId: string, link: string) => {
    markNotificationAsRead(notificationId);
    router.push(link);
  }

  const getAvatarContent = () => {
    if (role === 'admin') {
        return <Shield className="h-5 w-5" />;
    }
    if (role === 'commune_staff') {
        return <User className="h-5 w-5" />;
    }
    if (!currentUser?.displayName) return 'User';
    return currentUser.displayName.split(' ').map(n => n[0]).slice(-2).join('').toUpperCase();
  }
  
  const getAvatarAlt = () => {
     return currentUser?.displayName || (role === 'admin' ? 'Admin' : 'Cán bộ');
  }

  const notificationIcons: {[key: string]: React.ReactNode} = {
      'đã được duyệt': <CheckCircle2 className="h-4 w-4 text-green-500" />,
      'bị từ chối': <XCircle className="h-4 w-4 text-red-500" />,
      'vừa gửi': <FileUp className="h-4 w-4 text-primary" />,
      'gửi lại': <FileUp className="h-4 w-4 text-amber-500" />,
  }

  const getNotificationIcon = (title: string) => {
      const lowerCaseTitle = title.toLowerCase();
      if (lowerCaseTitle.includes('đã được duyệt')) return notificationIcons['đã được duyệt'];
      if (lowerCaseTitle.includes('bị từ chối')) return notificationIcons['bị từ chối'];
      if (lowerCaseTitle.includes('vừa gửi')) return notificationIcons['vừa gửi'];
      if (lowerCaseTitle.includes('gửi lại')) return notificationIcons['gửi lại'];
      return <Clock className="h-4 w-4 text-yellow-500" />;
  }

  return (
    <header className="sticky top-0 z-50 flex h-[72px] items-center gap-4 border-b bg-background px-4 sm:px-6">
      <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
          <Image src="/logo.png" alt="Logo" width={40} height={40} data-ai-hint="application logo" />
          <div>
              <h1 className="font-display-header text-lg uppercase tracking-wide text-header-blue whitespace-nowrap">
              ĐÁNH GIÁ CHUẨN TIẾP CẬN PHÁP LUẬT
              </h1>
              <h2 className="font-display-subheader text-base uppercase text-header-red whitespace-nowrap">
              TỈNH AN GIANG
              </h2>
          </div>
      </Link>

       <div className="ml-auto flex items-center gap-2">
        {currentUser && (
            <div className="hidden text-right lg:block">
              {currentUser.role === 'admin' ? (
                 <>
                    <p className="font-semibold text-sm">{currentUser.displayName}</p>
                    <p className="text-xs text-muted-foreground">Quản trị viên hệ thống</p>
                 </>
              ) : (
                <>
                    <p className="font-semibold text-sm">
                        {units.find(u => u.id === currentUser.communeId)?.name || 'Đơn vị không xác định'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {currentUser.displayName}
                        {currentUser.phoneNumber && ` - ${currentUser.phoneNumber}`}
                    </p>
                </>
              )}
            </div>
        )}
        
        {role === 'admin' && (
          <Link href="/admin/login-config">
              <Button variant="outline" size="icon">
                  <Paintbrush className="h-4 w-4" />
                  <span className="sr-only">Cấu hình trang đăng nhập</span>
              </Button>
          </Link>
        )}

        <Link href="/user-guide">
            <Button variant="outline" size="icon">
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Hướng dẫn sử dụng</span>
            </Button>
        </Link>
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
            <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4">
                    <h4 className="font-medium leading-none">Thông báo</h4>
                    <p className="text-sm text-muted-foreground">Bạn có {unreadNotifications} thông báo mới.</p>
                </div>
                <Separator />
                {notifications.filter(n => !n.read).length > 0 ? (
                    <div className="p-2 max-h-80 overflow-y-auto">
                        {notifications.filter(n => !n.read).map(notification => (
                            <div 
                                key={notification.id} 
                                className={cn(
                                    "mb-1 flex items-start gap-4 rounded-lg p-3 text-sm transition-colors hover:bg-muted/50 cursor-pointer",
                                    !notification.read && "bg-blue-50/50"
                                )}
                                onClick={() => handleNotificationClick(notification.id, notification.link)}
                            >
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
                ) : (
                    <div className="p-4 text-sm text-center text-muted-foreground">Không có thông báo mới.</div>
                )}
                
            </PopoverContent>
        </Popover>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-9 w-9">
                    <AvatarFallback className={cn('bg-primary text-primary-foreground', role === 'commune_staff' && 'bg-muted-foreground' )}>
                        {getAvatarContent()}
                    </AvatarFallback>
                </Avatar>
                <span className="sr-only">Mở menu người dùng</span>
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/profile" className='flex items-center gap-2'><Settings className='h-4 w-4' />Hồ sơ</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className='flex items-center gap-2'><LogOut className='h-4 w-4' />Đăng xuất</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Mobile navigation */}
        <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Mở menu điều hướng</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col p-0 w-[250px]">
             <AppSidebar isCollapsed={false} toggleSidebar={() => setIsMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
       </div>
    </header>
  );
}
