
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
import { Eye, CheckCircle, XCircle, Clock, FileX, ShieldQuestion } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React, { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Assessment, Unit } from '@/lib/data';

export default function ReviewAssessmentsPage() {
    const { assessmentPeriods, units, assessments } = useData();
    const [selectedPeriod, setSelectedPeriod] = React.useState<string | undefined>(
        assessmentPeriods.find(p => p.isActive)?.id
    );

    const { filteredAssessments, notSentCommunes } = useMemo(() => {
        if (!selectedPeriod) return { filteredAssessments: [], notSentCommunes: [] };

        const currentPeriodAssessments = assessments.filter(a => a.assessmentPeriodId === selectedPeriod);
        
        const allCommuneUnits = units.filter(u => u.type === 'commune');
        const sentCommuneIds = new Set(currentPeriodAssessments.map(a => a.communeId));

        const notSent = allCommuneUnits.filter(u => !sentCommuneIds.has(u.id));

        return { filteredAssessments: currentPeriodAssessments, notSentCommunes: notSent };
    }, [selectedPeriod, units, assessments]);
    
    const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
        'approved': { text: 'Đã duyệt', icon: CheckCircle, badge: 'default', className: 'bg-green-600' },
        'pending_review': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary' },
        'rejected': { text: 'Bị từ chối', icon: XCircle, badge: 'destructive' },
        'draft': { text: 'Bản nháp', icon: ShieldQuestion, badge: 'secondary' },
        'not_sent': { text: 'Chưa gửi', icon: FileX, badge: 'secondary', className: 'bg-muted text-muted-foreground' }
    };
    
    const getUnitName = (communeId: string) => {
        const unit = units.find(u => u.id === communeId);
        if (!unit) return { communeName: 'Không xác định', districtName: '', provinceName: '' };
        
        // This is a simplified logic. A real app would have proper relations.
        const district = units.find(u => u.id === unit.parentId);
        const province = units.find(u => u.id === district?.parentId);

        return {
            communeName: unit.name,
            districtName: district?.name || '',
            provinceName: province?.name || '',
        }
    }

    const AssessmentTable = ({ assessmentsToShow, status }: { assessmentsToShow: Assessment[] | Unit[], status: string }) => {
        if (status === 'not_sent') {
            return (
                 <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Tên đơn vị</TableHead>
                        <TableHead>Huyện</TableHead>
                        <TableHead>Tỉnh</TableHead>
                        <TableHead>Trạng thái</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {(assessmentsToShow as Unit[]).length > 0 ? (
                        (assessmentsToShow as Unit[]).map((unit) => {
                            const statusInfo = statusMap['not_sent'];
                            const unitInfo = getUnitName(unit.id);
                            return (
                                <TableRow key={unit.id}>
                                    <TableCell>
                                        <div className="font-medium">{unitInfo.communeName}</div>
                                    </TableCell>
                                    <TableCell>{unitInfo.districtName}</TableCell>
                                    <TableCell>{unitInfo.provinceName}</TableCell>
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
                        <TableCell colSpan={4} className="h-24 text-center">
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
                {(assessmentsToShow as Assessment[]).length > 0 ? (
                    (assessmentsToShow as Assessment[]).map((assessment) => {
                        const statusInfo = statusMap[assessment.status];
                        const unitInfo = getUnitName(assessment.communeId);
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
                                        {statusInfo.text}
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

    const tabs = [
        { value: "pending_review", label: "Chờ duyệt", data: filteredAssessments.filter(a => a.status === 'pending_review') },
        { value: "approved", label: "Đã duyệt", data: filteredAssessments.filter(a => a.status === 'approved') },
        { value: "rejected", label: "Bị từ chối", data: filteredAssessments.filter(a => a.status === 'rejected') },
        { value: "not_sent", label: "Chưa gửi", data: notSentCommunes },
    ];

    return (
        <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Duyệt hồ sơ đánh giá</CardTitle>
                    <CardDescription>
                    Xem xét và phê duyệt các hồ sơ đánh giá do các xã gửi lên theo từng đợt.
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
            <Tabs defaultValue="pending_review">
            <TabsList className="grid w-full grid-cols-4">
                {tabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label} ({tab.data.length})
                    </TabsTrigger>
                ))}
            </TabsList>
            {tabs.map(tab => (
                 <TabsContent key={tab.value} value={tab.value}>
                    <AssessmentTable assessmentsToShow={tab.data} status={tab.value} />
                </TabsContent>
            ))}
            </Tabs>
        </CardContent>
        </Card>
    );
}
