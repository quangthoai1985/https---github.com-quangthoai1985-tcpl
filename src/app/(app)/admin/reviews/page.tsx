
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { recentAssessments } from '@/lib/data';
import { Eye, CheckCircle, XCircle, Clock, FileX } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React, { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ReviewAssessmentsPage() {
    const { assessmentPeriods, units } = useData();
    const [selectedPeriod, setSelectedPeriod] = React.useState<string | undefined>(
        assessmentPeriods.find(p => p.status === 'Active')?.id
    );

    const { filteredAssessments, notSentCommunes } = useMemo(() => {
        if (!selectedPeriod) return { filteredAssessments: [], notSentCommunes: [] };

        const currentPeriodAssessments = recentAssessments.filter(a => a.assessmentPeriodId === selectedPeriod);
        
        const allCommuneUnits = units.filter(u => u.name.toLowerCase().includes('xã') || u.name.toLowerCase().includes('phường'));
        const sentCommuneIds = new Set(currentPeriodAssessments.map(a => a.unitId));

        const notSent = allCommuneUnits.filter(u => !sentCommuneIds.has(u.id));

        return { filteredAssessments: currentPeriodAssessments, notSentCommunes: notSent };
    }, [selectedPeriod, units]);

    const getAssessmentsByStatus = (status: string) => {
        if (status === 'all') return filteredAssessments;
        return filteredAssessments.filter((assessment) => assessment.status === status);
    };
  
    const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
        'Đã duyệt': { text: 'Đã duyệt', icon: CheckCircle, badge: 'default', className: 'bg-green-600' },
        'Chờ duyệt': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary' },
        'Bị từ chối': { text: 'Bị từ chối', icon: XCircle, badge: 'destructive' },
        'Chưa gửi': { text: 'Chưa gửi', icon: FileX, badge: 'secondary', className: 'bg-muted text-muted-foreground' }
    };
    
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


    const AssessmentTable = ({ status }: { status: string }) => {
        const assessments = getAssessmentsByStatus(status);
        if (status === 'Chưa gửi') {
            return (
                 <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Tên đơn vị</TableHead>
                        <TableHead>Trạng thái</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {notSentCommunes.length > 0 ? (
                        notSentCommunes.map((unit) => {
                            const statusInfo = statusMap['Chưa gửi'];
                            return (
                                <TableRow key={unit.id}>
                                    <TableCell>
                                    <div className="font-medium">{unit.name}</div>
                                    </TableCell>
                                    <TableCell>
                                    <Badge variant={statusInfo.badge} className={statusInfo.className}>
                                        <statusInfo.icon className="mr-2 h-4 w-4" />
                                        {statusInfo.text}
                                    </Badge>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center">
                            Tất cả các xã đã gửi hồ sơ.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            )
        }

        return (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Tên xã</TableHead>
                    <TableHead className="hidden md:table-cell">Ngày nộp</TableHead>
                    <TableHead className="hidden lg:table-cell">Trạng thái</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {assessments.length > 0 ? (
                    assessments.map((assessment) => {
                        const statusInfo = statusMap[assessment.status];
                        const unitInfo = getUnitName(assessment.unitId);
                        return (
                            <TableRow key={assessment.id}>
                                <TableCell>
                                <div className="font-medium">{unitInfo.communeName}</div>
                                <div className="text-sm text-muted-foreground">
                                    {unitInfo.districtName}, {unitInfo.provinceName}
                                </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                {assessment.submissionDate}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    <Badge variant={statusInfo.badge} className={statusInfo.className}>
                                        <statusInfo.icon className="mr-2 h-4 w-4" />
                                        {assessment.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/admin/reviews/${assessment.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Xem chi tiết
                                    </Link>
                                </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })
                ) : (
                    <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        Không có hồ sơ nào trong mục này.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        );
    };

    return (
        <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Duyệt hồ sơ đánh giá</CardTitle>
                    <CardDescription>
                    Xem xét và phê duyệt các hồ sơ đánh giá do các xã gửi lên.
                    </CardDescription>
                </div>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Chọn đợt đánh giá" />
                </SelectTrigger>
                <SelectContent>
                    {assessmentPeriods.map(period => (
                        <SelectItem key={period.id} value={period.id}>{period.name}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending">Chờ duyệt ({getAssessmentsByStatus('Chờ duyệt').length})</TabsTrigger>
                <TabsTrigger value="approved">Đã duyệt ({getAssessmentsByStatus('Đã duyệt').length})</TabsTrigger>
                <TabsTrigger value="rejected">Bị từ chối ({getAssessmentsByStatus('Bị từ chối').length})</TabsTrigger>
                <TabsTrigger value="not_sent">Chưa gửi ({notSentCommunes.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">
                <AssessmentTable status="Chờ duyệt" />
            </TabsContent>
            <TabsContent value="approved">
                <AssessmentTable status="Đã duyệt" />
            </TabsContent>
            <TabsContent value="rejected">
                <AssessmentTable status="Bị từ chối" />
            </TabsContent>
            <TabsContent value="not_sent">
                <AssessmentTable status="Chưa gửi" />
            </TabsContent>
            </Tabs>
        </CardContent>
        </Card>
    );
}
