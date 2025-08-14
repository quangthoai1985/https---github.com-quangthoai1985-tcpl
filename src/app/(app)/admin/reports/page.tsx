
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
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { criteria } from '@/lib/data';
import { Download } from 'lucide-react';
import { Pie, PieChart, Cell, BarChart, XAxis, YAxis, Bar, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';

export default function ReportsPage() {
    const { assessmentPeriods, recentAssessments, units: allUnits } = useData();
    const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(assessmentPeriods.find(p => p.status === 'Active')?.id);

    // Calculate real data for charts based on the selected period
    const chartData = useMemo(() => {
        if (!selectedPeriod) {
            return { statusData: [], criteriaSuccessRate: [] };
        }
        
        const periodAssessments = recentAssessments.filter(a => a.assessmentPeriodId === selectedPeriod);

        const totalCommunes = allUnits.filter(u => u.name.toLowerCase().includes('xã') || u.name.toLowerCase().includes('phường')).length;
        const submittedCount = periodAssessments.length;
        
        const approvedCount = periodAssessments.filter(a => a.status === 'Đã duyệt').length;
        const pendingCount = periodAssessments.filter(a => a.status === 'Chờ duyệt').length;
        const rejectedCount = periodAssessments.filter(a => a.status === 'Bị từ chối').length;
        const notSentCount = totalCommunes > submittedCount ? totalCommunes - submittedCount : 0;

        const statusData = [
            { name: 'Đã duyệt', value: approvedCount, fill: 'hsl(var(--chart-2))' },
            { name: 'Chờ duyệt', value: pendingCount, fill: 'hsl(var(--chart-5))' },
            { name: 'Bị từ chối', value: rejectedCount, fill: 'hsl(var(--chart-4))' },
            { name: 'Chưa gửi', value: notSentCount, fill: 'hsl(var(--muted))' },
        ].filter(d => d.value > 0); // Only show statuses with count > 0

        const criteriaSuccessRate = criteria.map((c, i) => {
            // This is a more realistic simulation based on selected period data.
            // A real implementation would calculate this from actual indicator results.
            const baseRate = 60;
            // Make the random factor dependent on the selected period and approved count for some variability
            const randomFactor = (i * 5 + approvedCount + (selectedPeriod?.charCodeAt(selectedPeriod.length-1) || 0)) % 35;
            return {
                name: `TC ${i + 1}`,
                "Tỷ lệ đạt": baseRate + randomFactor,
                tooltip: c.name.replace(`Tiêu chí ${i + 1}: `, '')
            };
        });
        
        return { statusData, criteriaSuccessRate };

    }, [selectedPeriod, recentAssessments, allUnits]);


  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Báo cáo & Thống kê</CardTitle>
            <CardDescription>
              Phân tích và xem báo cáo chi tiết về tình hình tiếp cận pháp luật theo từng đợt.
            </CardDescription>
          </div>
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
            <CardDescription>Tỷ lệ các xã theo trạng thái đánh giá.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{}}
              className="mx-auto aspect-square h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                     <Pie
                      data={chartData.statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      strokeWidth={5}
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                          const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                          if (percent < 0.05) return null; // Hide label if too small
                          return (
                            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                    >
                      {chartData.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" />
                  </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Tỷ lệ đạt theo tiêu chí</CardTitle>
            <CardDescription>Tỷ lệ % xã đạt các chỉ tiêu trong từng tiêu chí cốt lõi.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.criteriaSuccessRate} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
  );
}

    