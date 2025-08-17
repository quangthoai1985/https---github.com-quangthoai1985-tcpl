
'use client';
import {
  Users,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  ArrowRight,
  Edit,
  FileClock,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import { Pie, PieChart, Cell, ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import React from 'react';
import PageHeader from '@/components/layout/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Unit } from '@/lib/data';


const AdminDashboard = () => {
    const { units, assessments, assessmentPeriods } from useData();
    const [selectedPeriod, setSelectedPeriod] = React.useState<string | undefined>(assessmentPeriods.find(p => p.isActive)?.id);

    const {
        periodAssessments,
        totalCommunes,
        pendingCount,
        approvedCount,
        rejectedCount,
        assessmentStatusChartData,
        chartConfig,
        progressData,
    } = React.useMemo(() => {
        const allCommuneUnits = units.filter(u => u.type === 'commune');
        const totalCommunes = allCommuneUnits.length;
        
        const periodAssessments = selectedPeriod 
            ? assessments.filter(a => a.assessmentPeriodId === selectedPeriod)
            : [];
        
        const sentCommuneIds = new Set(periodAssessments.map(a => a.communeId));
        
        const pendingCount = periodAssessments.filter(a => a.status === 'pending_review').length;
        const approvedCount = periodAssessments.filter(a => a.status === 'approved').length;
        const rejectedCount = periodAssessments.filter(a => a.status === 'rejected').length;
        const notSentCount = totalCommunes - sentCommuneIds.size;

        const chartData = [
            { name: 'Đã duyệt', value: approvedCount, fill: 'hsl(var(--chart-2))' },
            { name: 'Chờ duyệt', value: pendingCount, fill: 'hsl(var(--chart-3))' },
            { name: 'Bị từ chối', value: rejectedCount, fill: 'hsl(var(--chart-4))' },
            { name: 'Chưa gửi', value: notSentCount, fill: 'hsl(var(--muted))' },
        ];
        
        const assessmentStatusChartData = chartData.filter(d => d.value > 0);
        
        const chartConfig: any = {};
        assessmentStatusChartData.forEach(item => {
            chartConfig[item.name] = {
                label: item.name,
                color: item.fill,
            };
        });

        // Mock progress data for now, as we don't have time-series data
        const progressData = [
          { name: 'Tuần 1', 'Số lượng': Math.max(0, Math.floor(sentCommuneIds.size * 0.1) - 1) },
          { name: 'Tuần 2', 'Số lượng': Math.max(0, Math.floor(sentCommuneIds.size * 0.3) - 2) },
          { name: 'Tuần 3', 'Số lượng': Math.max(0, Math.floor(sentCommuneIds.size * 0.6) - 5) },
          { name: 'Tuần 4', 'Số lượng': sentCommuneIds.size },
        ];


        return {
            periodAssessments,
            totalCommunes,
            pendingCount,
            approvedCount,
            rejectedCount,
            assessmentStatusChartData,
            chartConfig,
            progressData,
        };

    }, [selectedPeriod, assessments, units]);


    const kpiCards = [
      { 
        title: "Tổng số xã", 
        value: totalCommunes.toString(), 
        icon: Users, 
        color: "bg-blue-500",
        link: "/admin/units"
      },
      { 
        title: "Chờ duyệt", 
        value: pendingCount.toString(), 
        icon: FileClock, 
        color: "bg-amber-500",
        link: "/admin/reviews"
      },
      { 
        title: "Đã duyệt", 
        value: approvedCount.toString(), 
        icon: ThumbsUp, 
        color: "bg-emerald-500",
        link: "/admin/reviews"
      },
      { 
        title: "Bị từ chối", 
        value: rejectedCount.toString(), 
        icon: ThumbsDown, 
        color: "bg-red-500",
        link: "/admin/reviews"
      },
    ];

    const getUnitName = (communeId?: string) => {
        if (!communeId) return { communeName: 'Không xác định', districtName: '', provinceName: '' };
        
        const unit = units.find(u => u.id === communeId);
        if (!unit) return { communeName: 'Không xác định', districtName: '', provinceName: '' };
        
        const district = units.find(u => u.id === unit.parentId);
        const province = units.find(u => u.id === district?.parentId);

        return {
            communeName: unit.name,
            districtName: district?.name || '',
            provinceName: province?.name || '',
        }
    }


    return (
    <>
    <div className="flex items-center justify-between">
        <PageHeader title="Tổng quan" description="Xem các chỉ số và hoạt động tổng thể của hệ thống." />
         <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Chọn đợt đánh giá" />
            </SelectTrigger>
            <SelectContent>
                {assessmentPeriods.map(period => (
                    <SelectItem key={period.id} value={period.id}>{period.name}</SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>
    </div>
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Link href={card.link} key={index}>
              <Card className={`${card.color} text-white shadow-lg transition-transform transform hover:scale-102`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <Icon className="h-5 w-5" />
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Đánh giá các xã ({assessmentPeriods.find(p=>p.id===selectedPeriod)?.name || 'Tất cả'})</CardTitle>
            <CardDescription>Phân bố trạng thái của các hồ sơ trong đợt được chọn.</CardDescription>
          </CardHeader>
           <CardContent className="flex items-center justify-center">
            <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square h-[300px]"
            >
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                        data={assessmentStatusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        strokeWidth={5}
                    >
                        {assessmentStatusChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} className="stroke-background hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"/>
                        ))}
                    </Pie>
                     <ChartLegend
                        content={<ChartLegendContent nameKey="name" />}
                        className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                    />
                    </PieChart>
                </ResponsiveContainer>
             </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Tiến độ nộp hồ sơ</CardTitle>
             <CardDescription>Số lượng hồ sơ nộp theo thời gian (dữ liệu giả định).</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }}/>
                        <YAxis tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                border: '1px solid hsl(var(--border))'
                            }}
                        />
                        <Line type="monotone" dataKey="Số lượng" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Đánh giá chờ duyệt gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Xã</TableHead>
                  <TableHead className="hidden font-semibold md:table-cell">Ngày gửi</TableHead>
                  <TableHead className="hidden font-semibold lg:table-cell">Người gửi</TableHead>
                  <TableHead className="font-semibold">Trạng thái</TableHead>
                  <TableHead><span className="sr-only">Hành động</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodAssessments.filter(a => a.status === 'pending_review').map((assessment) => {
                    const unitInfo = getUnitName(assessment.communeId);
                    return (
                        <TableRow key={assessment.id} className="hover:bg-muted/50">
                            <TableCell>
                            <div className="font-medium">{unitInfo.communeName}</div>
                            <div className="text-sm text-muted-foreground">
                                {unitInfo.districtName}, {unitInfo.provinceName}
                            </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{assessment.submissionDate}</TableCell>
                            <TableCell className="hidden lg:table-cell">{assessment.submittedBy}</TableCell>
                            <TableCell>
                            <Badge className="bg-amber-500 text-white hover:bg-amber-500/90">Chờ duyệt</Badge>
                            </TableCell>
                            <TableCell>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/admin/reviews/${assessment.id}`}>Xem chi tiết</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
    </>
)};

const CommuneDashboard = () => {
    const { units, assessments, currentUser, assessmentPeriods } = useData();
    const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
        'approved': { text: 'Đã duyệt', icon: CheckCircle, badge: 'default', className: 'bg-emerald-500' },
        'pending_review': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary', className: 'bg-amber-500' },
        'rejected': { text: 'Bị từ chối', icon: XCircle, badge: 'destructive', className: 'bg-red-500' },
        'draft': { text: 'Bản nháp', icon: Edit, badge: 'secondary' },
    };

    const communeAssessments = currentUser ? assessments.filter(a => a.communeId === currentUser.communeId) : [];
    
    const activePeriod = assessmentPeriods.find(p => p.isActive);

    const getPeriodName = (periodId: string) => {
        return assessmentPeriods.find(p => p.id === periodId)?.name || 'Không xác định';
    }


    return (
        <>
        <PageHeader title="Tổng quan" description="Thông tin tổng quan và các tác vụ nhanh."/>
        <div className="flex flex-col gap-6">
            {activePeriod ? (
            <Card>
                <CardHeader>
                    <CardTitle>Kỳ đánh giá: {activePeriod.name}</CardTitle>
                    <CardDescription>
                        Hạn chót nộp hồ sơ là ngày {activePeriod.endDate}. Vui lòng hoàn thành việc tự chấm điểm và gửi đi đúng hạn.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild>
                        <Link href="/commune/assessments">
                            Thực hiện Tự chấm điểm <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
            ) : (
             <Card>
                <CardHeader>
                    <CardTitle>Thông báo</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Hiện tại không có kỳ đánh giá nào đang hoạt động. Vui lòng chờ Admin khởi tạo.</p>
                </CardContent>
            </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Lịch sử các đợt đánh giá</CardTitle>
                    <CardDescription>
                        Theo dõi trạng thái các hồ sơ đánh giá bạn đã gửi.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kỳ đánh giá</TableHead>
                                <TableHead>Ngày nộp</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {communeAssessments.length > 0 ? communeAssessments.map(assessment => {
                               if (!assessment) return null;
                               const statusInfo = statusMap[assessment.status];
                               return (
                                    <TableRow key={assessment.id}>
                                        <TableCell className="font-medium">{getPeriodName(assessment.assessmentPeriodId)}</TableCell>
                                        <TableCell>{assessment.submissionDate || 'Chưa nộp'}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusInfo.badge} className={`${statusInfo.className} text-white`}>
                                                <statusInfo.icon className="mr-2 h-4 w-4" />
                                                {statusInfo.text}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/reviews/${assessment.id}`}>
                                                  {assessment.status === 'rejected' ? 
                                                    <><Edit className="mr-2 h-4 w-4" />Giải trình & Gửi lại</> : 
                                                    assessment.status === 'draft' ?
                                                    <><Edit className="mr-2 h-4 w-4" />Tiếp tục chấm điểm</> :
                                                    <><Eye className="mr-2 h-4 w-4" />Xem chi tiết</>
                                                  }
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                               )
                           }) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">Chưa có hồ sơ đánh giá nào.</TableCell>
                            </TableRow>
                           )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        </>
    );
};


export default function DashboardPage() {
  const { role } = useData();

  return (
    <div className="flex flex-1 flex-col gap-4">
      {role === 'admin' ? <AdminDashboard /> : <CommuneDashboard />}
    </div>
  );
}
