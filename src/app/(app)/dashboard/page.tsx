
'use client';
import {
  FileCheck2,
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
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { recentAssessments, progressData, units as allUnits } from '@/lib/data';
import Link from 'next/link';
import { useData } from '@/context/DataContext';


const AdminDashboard = () => {
    const { users, units } = useData();

    const totalCommunes = units.filter(u => u.name.toLowerCase().includes('xã') || u.name.toLowerCase().includes('phường')).length;
    const pendingCount = recentAssessments.filter(a => a.status === 'Chờ duyệt').length;
    const approvedCount = recentAssessments.filter(a => a.status === 'Đã duyệt').length;
    const rejectedCount = recentAssessments.filter(a => a.status === 'Bị từ chối').length;
    const sentCount = pendingCount + approvedCount + rejectedCount;
    const notSentCount = totalCommunes > sentCount ? totalCommunes - sentCount : 0;


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
        color: "bg-gray-500",
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

    const assessmentStatusChartData = [
      { name: 'Đã duyệt', value: approvedCount, fill: 'hsl(var(--chart-2))' }, // emerald-500
      { name: 'Chờ duyệt', value: pendingCount, fill: 'hsl(var(--chart-5))' }, // gray-500
      { name: 'Bị từ chối', value: rejectedCount, fill: 'hsl(var(--chart-4))' }, // red-500
      { name: 'Chưa gửi', value: notSentCount, fill: 'hsl(var(--muted))' }, // gray-100
    ];

    const getUnitName = (unitId: string) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) return { communeName: 'Không xác định', districtName: '', provinceName: '' };
        const parts = unit.name.split(',').map(p => p.trim());
        return {
            communeName: parts[0] || '',
            districtName: parts[1] || '',
            provinceName: parts[2] || '',
        }
    }


    return (
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
            <CardTitle>Đánh giá các xã</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                        data={assessmentStatusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                    >
                        {assessmentStatusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                        border: '1px solid hsl(var(--border))'
                    }} />
                    <Legend
                        iconType="circle"
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ right: -10 }}
                    />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Tiến độ đánh giá</CardTitle>
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
            <CardTitle>Đánh giá chờ duyệt</CardTitle>
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
                {recentAssessments.filter(a => a.status === 'Chờ duyệt').map((assessment) => {
                    const unitInfo = getUnitName(assessment.unitId);
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
)};

const CommuneDashboard = () => {
    const { units } = useData();
    const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
        'Đã duyệt': { text: 'Đã duyệt', icon: CheckCircle, badge: 'default', className: 'bg-emerald-500' },
        'Chờ duyệt': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary', className: 'bg-amber-500' },
        'Bị từ chối': { text: 'Bị từ chối', icon: XCircle, badge: 'destructive', className: 'bg-red-500' },
    };

    const communeAssessments = [
        recentAssessments.find(a => a.status === 'Đã duyệt'),
        recentAssessments.find(a => a.status === 'Chờ duyệt'),
        recentAssessments.find(a => a.status === 'Bị từ chối'),
    ].filter(Boolean); // Filter out undefined if a status is not found

    const getUnitName = (unitId: string) => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) return { communeName: 'Không xác định', districtName: '', provinceName: '' };
        const parts = unit.name.split(',').map(p => p.trim());
        return {
            communeName: parts[0] || '',
            districtName: parts[1] || '',
            provinceName: parts[2] || '',
        }
    }


    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Kỳ đánh giá 6 tháng đầu năm 2024</CardTitle>
                    <CardDescription>
                        Hạn chót nộp hồ sơ là ngày 30/07/2024. Vui lòng hoàn thành việc tự chấm điểm và gửi đi đúng hạn.
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
                           {communeAssessments.map(assessment => {
                               if (!assessment) return null;
                               const statusInfo = statusMap[assessment.status];
                               return (
                                    <TableRow key={assessment.id}>
                                        <TableCell className="font-medium">6 tháng đầu năm 2024</TableCell>
                                        <TableCell>{assessment.submissionDate}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusInfo.badge} className={`${statusInfo.className} text-white`}>
                                                <statusInfo.icon className="mr-2 h-4 w-4" />
                                                {statusInfo.text}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/reviews/${assessment.id}`}>
                                                  {assessment.status === 'Bị từ chối' ? 
                                                    <><Edit className="mr-2 h-4 w-4" />Giải trình & Gửi lại</> : 
                                                    <><Eye className="mr-2 h-4 w-4" />Xem chi tiết</>
                                                  }
                                                </Link>
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
