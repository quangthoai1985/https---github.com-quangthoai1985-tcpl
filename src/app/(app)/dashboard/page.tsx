
'use client';
import {
  FileCheck2,
  GanttChartSquare,
  TrendingUp,
  Users,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
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
import { Pie, PieChart, Cell } from 'recharts';
import { dashboardStats, recentAssessments, assessmentStatusChartData } from '@/lib/data';
import Link from 'next/link';
import { useData } from '@/context/DataContext';

const iconMap = {
  Users: Users,
  FileCheck2: FileCheck2,
  GanttChartSquare: GanttChartSquare,
  TrendingUp: TrendingUp,
};

const AdminDashboard = () => (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat, index) => {
          const Icon = iconMap[stat.icon as keyof typeof iconMap] || Users;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Đánh giá gần đây</CardTitle>
            <CardDescription>
              Danh sách các xã nộp hồ sơ đánh giá gần nhất.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên xã</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Ngày nộp
                  </TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAssessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>
                      <div className="font-medium">{assessment.communeName}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {assessment.districtName}, {assessment.provinceName}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {assessment.submissionDate}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          assessment.status === 'Đã duyệt'
                            ? 'default'
                            : assessment.status === 'Bị từ chối'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className={assessment.status === 'Đã duyệt' ? 'bg-green-600' : ''}
                      >
                        {assessment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Tổng quan trạng thái</CardTitle>
            <CardDescription>Phân bố trạng thái đánh giá của các xã.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{}}
              className="mx-auto aspect-square h-[250px]"
            >
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
                  {assessmentStatusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </>
);

const CommuneDashboard = () => {
    const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
        'Đã duyệt': { text: 'Đã duyệt', icon: CheckCircle, badge: 'default', className: 'bg-green-600' },
        'Chờ duyệt': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary' },
        'Bị từ chối': { text: 'Bị từ chối', icon: XCircle, badge: 'destructive' },
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
                                            <Badge variant={statusInfo.badge} className={statusInfo.className}>
                                                <statusInfo.icon className="mr-2 h-4 w-4" />
                                                {statusInfo.text}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <Button variant="outline" size="sm" asChild>
                                                {/* In a real app, this would link to a read-only or editable version of the assessment */}
                                                <Link href="#">
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Xem chi tiết
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
