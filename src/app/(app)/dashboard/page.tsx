'use client';
import {
  FileCheck2,
  GanttChartSquare,
  TrendingUp,
  Users,
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import { dashboardStats, recentAssessments, assessmentStatusChartData } from '@/lib/data';

const iconMap = {
  Users: Users,
  FileCheck2: FileCheck2,
  GanttChartSquare: GanttChartSquare,
  TrendingUp: TrendingUp,
};

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4">
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
    </div>
  );
}
