
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

export default function AppHeader() {
  const { role, currentUser, units, logout, notifications } = useData();
  const router = useRouter();
  const unreadNotifications = notifications.filter(n => !n.read).length;
  
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

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
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b bg-background px-4 sm:px-6">
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

      <div className="flex items-center gap-3">
         <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
            <Image src="/logo.png" alt="Logo" width={40} height={40} data-ai-hint="application logo" />
            <span className="font-headline text-xl font-bold uppercase tracking-wide text-foreground">
              ĐÁNH GIÁ CHUẨN TIẾP CẬN PHÁP LUẬT
            </span>
          </Link>
      </div>

       <div className="ml-auto flex items-center gap-4">
        {currentUser && (
            <div className="hidden text-right lg:block">
                <p className="font-semibold text-sm">{currentUser.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {currentUser.role === 'admin' 
                    ? 'Quản trị viên hệ thống' 
                    : 'Cán bộ phụ trách'
                  }
                </p>
            </div>
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
                {notifications.length > 0 ? (
                    <div className="p-2 max-h-80 overflow-y-auto">
                        {notifications.map(notification => (
                            <Link href={notification.link} key={notification.id} className="block">
                                <div className={cn(
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
                            </Link>
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
       </div>
    </header>
  );
}
