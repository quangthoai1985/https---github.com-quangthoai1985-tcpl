
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
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { dashboardStats, recentAssessments, assessmentStatusChartData, progressData } from '@/lib/data';
import Link from 'next/link';
import { useData } from '@/context/DataContext';

const kpiCards = [
  { 
    title: "Tổng số xã", 
    value: "126", 
    icon: Users, 
    color: "bg-blue-500",
    link: "/admin/units"
  },
  { 
    title: "Chờ duyệt", 
    value: "8", 
    icon: FileClock, 
    color: "bg-gray-500",
    link: "/admin/reviews"
  },
  { 
    title: "Đã duyệt", 
    value: "42", 
    icon: ThumbsUp, 
    color: "bg-emerald-500",
    link: "/admin/reviews"
  },
  { 
    title: "Bị từ chối", 
    value: "5", 
    icon: ThumbsDown, 
    color: "bg-red-500",
    link: "/admin/reviews"
  },
];


const AdminDashboard = () => (
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
                    <Tooltip />
                    <legend
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
                        <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#e5e7eb' }}/>
                        <YAxis tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                border: '1px solid #e5e7eb'
                            }}
                        />
                        <Line type="monotone" dataKey="Số lượng" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
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
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Xã</TableHead>
                  <TableHead className="hidden font-semibold md:table-cell">Ngày gửi</TableHead>
                  <TableHead className="hidden font-semibold lg:table-cell">Người gửi</TableHead>
                  <TableHead className="font-semibold">Trạng thái</TableHead>
                  <TableHead><span className="sr-only">Hành động</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAssessments.filter(a => a.status === 'Chờ duyệt').map((assessment) => (
                  <TableRow key={assessment.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="font-medium">{assessment.communeName}</div>
                      <div className="text-sm text-muted-foreground">
                        {assessment.districtName}, {assessment.provinceName}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{assessment.submissionDate}</TableCell>
                    <TableCell className="hidden lg:table-cell">{assessment.submittedBy}</TableCell>
                    <TableCell>
                      <Badge className="bg-amber-500 text-white">Chờ duyệt</Badge>
                    </TableCell>
                    <TableCell>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/reviews/${assessment.id}`}>Xem chi tiết</Link>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
);

const CommuneDashboard = () => {
    const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
        'Đã duyệt': { text: 'Đã duyệt', icon: CheckCircle, badge: 'default', className: 'bg-emerald-500' },
        'Chờ duyệt': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary', className: 'bg-amber-500' },
        'Bị từ chối': { text: 'Bị từ chối', icon: XCircle, badge: 'destructive', className: 'bg-red-500' },
    };

    const communeAssessments = [
        recentAssessments[1], // Đã duyệt
        recentAssessments[0], // Chờ duyệt
        recentAssessments[2], // Bị từ chối
    ];

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
