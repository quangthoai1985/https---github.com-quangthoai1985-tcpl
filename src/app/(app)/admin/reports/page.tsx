
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
import { assessmentStatusChartData, criteria } from '@/lib/data';
import { Download } from 'lucide-react';
import { Pie, PieChart, Cell, BarChart, XAxis, YAxis, Bar, CartesianGrid, Tooltip } from 'recharts';
import { useState } from 'react';
import { useData } from '@/context/DataContext';


const successRateByCriteria = criteria.map((c, i) => ({
  name: `TC ${i + 1}`,
  "Tỷ lệ đạt": Math.floor(Math.random() * (95 - 60 + 1)) + 60,
  tooltip: c.name.replace(`Tiêu chí ${i + 1}: `, '')
}));


export default function ReportsPage() {
    const { assessmentPeriods } = useData();
    const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(assessmentPeriods.find(p => p.status === 'Active')?.id);


  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Báo cáo & Thống kê</CardTitle>
            <CardDescription>
              Phân tích và xem báo cáo chi tiết về tình hình tiếp cận pháp luật.
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
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Tỷ lệ đạt theo tiêu chí</CardTitle>
            <CardDescription>Tỷ lệ % xã đạt các chỉ tiêu trong từng tiêu chí cốt lõi.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
              <BarChart data={successRateByCriteria} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis unit="%" tickLine={false} axisLine={false} />
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
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
