
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
  HelpCircle,
  UserCheck,
  Megaphone,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useData } from '@/context/DataContext';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const adminNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { href: '/admin/users', icon: Users, label: 'Quản lý Người dùng' },
  { href: '/admin/units', icon: Building, label: 'Quản lý Đơn vị' },
  { href: '/admin/registrations', icon: UserCheck, label: 'Quản lý Đăng ký'},
  { href: '/admin/criteria', icon: FileCheck2, label: 'Quản lý Tiêu chí' },
  { href: '/admin/assessment-periods', icon: CalendarClock, label: 'Quản lý Đợt đánh giá' },
  { href: '/admin/reviews', icon: GanttChartSquare, label: 'Duyệt Đánh giá' },
  { href: '/admin/announcements', icon: Megaphone, label: 'Công bố Đánh giá' },
  { href: '/admin/reports', icon: FileText, label: 'Báo cáo & Thống kê' },
  { href: '/documents', icon: Book, label: 'Văn bản Hướng dẫn' },
  { href: '/user-guide', icon: HelpCircle, label: 'Hướng dẫn sử dụng' },
];

const communeNavItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Đăng ký & Tổng quan' },
    { href: '/commune/assessments', icon: FileCheck2, label: 'Tự Chấm điểm' },
    { href: '/documents', icon: Book, label: 'Văn bản Hướng dẫn' },
    { href: '/user-guide', icon: HelpCircle, label: 'Hướng dẫn sử dụng' },
];

interface AppSidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export default function AppSidebar({ isCollapsed, toggleSidebar }: AppSidebarProps) {
  const pathname = usePathname();
  const { role, assessments, currentUser } = useData();

  const myAssessment = assessments.find(a => a.communeId === currentUser?.communeId);
  const canStartAssessment = myAssessment?.registrationStatus === 'approved';

  const navItems = role === 'admin' ? adminNavItems : communeNavItems;
  const pendingCount = role === 'admin' ? assessments.filter(a => a.assessmentStatus === 'pending_review').length : 0;

  return (
    <aside 
      className={cn(
        "fixed left-0 top-[72px] h-[calc(100vh-72px)] bg-background border-r flex flex-col transition-all duration-300 ease-in-out z-40",
        isCollapsed ? 'w-[60px]' : 'w-[250px]'
      )}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
         <TooltipProvider>
          <nav className="grid items-start p-2 text-sm font-medium">
            {navItems.map((item) => {
              const isAssessmentLink = item.href === '/commune/assessments';
              const isDisabled = role === 'commune_staff' && isAssessmentLink && !canStartAssessment;

              const linkContent = (
                <Link
                  key={item.href}
                  href={isDisabled ? '#' : item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all',
                    isDisabled 
                      ? 'cursor-not-allowed opacity-50' 
                      : 'hover:text-primary hover:bg-muted',
                    pathname === item.href && !isDisabled ? 'bg-muted text-primary' : 
                    (pathname.startsWith(item.href) && item.href !== '/dashboard' && !isDisabled) ? 'bg-muted text-primary' : '',
                    isCollapsed && 'justify-center'
                  )}
                  aria-disabled={isDisabled}
                  tabIndex={isDisabled ? -1 : undefined}
                  onClick={(e) => {
                    if (isDisabled) e.preventDefault();
                  }}
                >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className={cn('truncate', isCollapsed && 'sr-only')}>
                        {item.label}
                    </span>
                    {item.href === '/admin/reviews' && pendingCount > 0 && role === 'admin' && !isCollapsed && (
                        <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                        {pendingCount}
                        </Badge>
                    )}
                </Link>
              );

              return isCollapsed ? (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-4">
                    {item.label}
                    {item.href === '/admin/reviews' && pendingCount > 0 && role === 'admin' && (
                        <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                         {pendingCount}
                        </Badge>
                    )}
                  </TooltipContent>
                </Tooltip>
              ) : (
                linkContent
              );
            })}
          </nav>
        </TooltipProvider>
      </div>

       <div className="mt-auto p-2 border-t">
          <Button variant="ghost" size="icon" className="w-full" onClick={toggleSidebar}>
            <PanelLeft className="h-4 w-4" />
          </Button>
       </div>
    </aside>
  );
}
