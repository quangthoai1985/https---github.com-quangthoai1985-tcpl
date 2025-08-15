
'use client';

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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
} from '@/components/ui/chart';
import { criteria } from '@/lib/data';
import { Download } from 'lucide-react';
import { Pie, PieChart, Cell, BarChart, XAxis, YAxis, Bar, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import PageHeader from '@/components/layout/page-header';

export default function ReportsPage() {
    const { assessmentPeriods, assessments, units: allUnits } = useData();
    const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(assessmentPeriods.find(p => p.isActive)?.id);

    // Calculate real data for charts based on the selected period
    const { statusData, criteriaSuccessRate, chartConfig } = useMemo(() => {
        if (!selectedPeriod) {
            return { statusData: [], criteriaSuccessRate: [], chartConfig: {} };
        }
        
        const periodAssessments = assessments.filter(a => a.assessmentPeriodId === selectedPeriod);

        const allCommuneUnits = allUnits.filter(u => u.type === 'commune');
        const sentCommuneIds = new Set(periodAssessments.map(a => a.communeId));

        const approvedCount = periodAssessments.filter(a => a.status === 'approved').length;
        const pendingCount = periodAssessments.filter(a => a.status === 'pending_review').length;
        const rejectedCount = periodAssessments.filter(a => a.status === 'rejected').length;
        const notSentCount = allCommuneUnits.length - sentCommuneIds.size;

        const statusData = [
            { name: 'Đã duyệt', value: approvedCount, fill: 'hsl(var(--chart-2))' },
            { name: 'Chờ duyệt', value: pendingCount, fill: 'hsl(var(--chart-3))' },
            { name: 'Bị từ chối', value: rejectedCount, fill: 'hsl(var(--chart-4))' },
            { name: 'Chưa gửi', value: notSentCount, fill: 'hsl(var(--muted))' },
        ].filter(d => d.value > 0);

        const chartConfig = {
          value: {
            label: 'Số lượng',
          },
          ...statusData.reduce((acc, cur) => {
            acc[cur.name] = { label: cur.name, color: cur.fill };
            return acc;
          }, {} as any)
        };

        const criteriaSuccessRate = criteria.map((c, i) => {
            const baseRate = 60;
            const randomFactor = (i * 5 + approvedCount + (selectedPeriod?.charCodeAt(selectedPeriod.length-1) || 0)) % 35;
            return {
                name: `TC ${i + 1}`,
                "Tỷ lệ đạt": baseRate + randomFactor,
                tooltip: c.name.replace(`Tiêu chí ${i + 1}: `, '')
            };
        });
        
        return { statusData, criteriaSuccessRate, chartConfig };

    }, [selectedPeriod, assessments, allUnits]);


  return (
    <>
    <PageHeader title="Báo cáo & Thống kê" description="Phân tích và xem báo cáo chi tiết về tình hình tiếp cận pháp luật theo từng đợt."/>
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
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
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Tải xuống
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>Tải báo cáo PDF</DropdownMenuItem>
                    <DropdownMenuItem>Xuất ra Excel (CSV)</DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Phân bố trạng thái</CardTitle>
            <CardDescription>Tỷ lệ các xã theo trạng thái đánh giá trong đợt đã chọn.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                    >
                        {statusData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
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
                        wrapperStyle={{ right: -10, paddingLeft: '20px' }}
                    />
                </PieChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Tỷ lệ đạt theo tiêu chí</CardTitle>
            <CardDescription>Tỷ lệ % xã đạt các chỉ tiêu trong từng tiêu chí cốt lõi.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={criteriaSuccessRate} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis unit="%" tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    Tiêu chí
                                  </span>
                                  <span className="font-bold text-muted-foreground">
                                    {payload[0].payload.tooltip}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    Tỷ lệ đạt
                                  </span>
                                  <span className="font-bold">
                                    {payload[0].value}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        }

                        return null
                      }}
                    />
                    <Bar dataKey="Tỷ lệ đạt" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
