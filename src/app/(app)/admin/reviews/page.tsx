
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
import { Eye, CheckCircle, XCircle, Clock, FileX, ShieldQuestion, Award, Undo2, Send } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React, { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Assessment, Unit, Criterion, User, IndicatorResult } from '@/lib/data';
import PageHeader from '@/components/layout/page-header';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const countTotalIndicators = (criteria: Criterion[]): number => {
    return criteria.reduce((total, criterion) => {
        return total + criterion.indicators.reduce((indicatorTotal, indicator) => {
            if (indicator.subIndicators && indicator.subIndicators.length > 0) {
                return indicatorTotal + indicator.subIndicators.length;
            }
            return indicatorTotal + 1;
        }, 0);
    }, 0);
};

const calculateProgress = (assessmentData: Record<string, IndicatorResult> | undefined, totalIndicators: number): number => {
    if (!assessmentData || totalIndicators === 0) {
        return 0;
    }
    
    // Đếm số chỉ tiêu đã có giá trị hoặc được đánh dấu là không thực hiện
    const assessedCount = Object.values(assessmentData).filter(result => 
        result.isTasked === false || (result.value !== null && result.value !== undefined && result.value !== '' && result.value !== 0)
    ).length;
    
    return Math.round((assessedCount / totalIndicators) * 100);
};

export default function ReviewAssessmentsPage() {
    const { assessmentPeriods, units, assessments, users, updateAssessments, currentUser, criteria } = useData();
    const { toast } = useToast();

    const [selectedPeriod, setSelectedPeriod] = React.useState<string | undefined>(
        assessmentPeriods.find(p => p.isActive)?.id
    );

    const { filteredAssessments } = useMemo(() => {
        if (!selectedPeriod) return { filteredAssessments: [] };
        // We only care about assessments that have passed the registration phase
        const currentPeriodAssessments = assessments.filter(a => 
            a.assessmentPeriodId === selectedPeriod && a.registrationStatus === 'approved'
        );
        return { filteredAssessments: currentPeriodAssessments };
    }, [selectedPeriod, assessments]);

    const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
        'pending_review': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary', className: 'bg-amber-500 hover:bg-amber-600' },
        'returned_for_revision': { text: 'Yêu cầu Bổ sung', icon: Undo2, badge: 'destructive', className: 'bg-amber-600 hover:bg-amber-700' },
        'rejected': { text: 'Không đạt chuẩn', icon: XCircle, badge: 'destructive' },
        'achieved_standard': { text: 'Đạt chuẩn', icon: Award, badge: 'default', className: 'bg-blue-600 hover:bg-blue-700' },
        'draft': { text: 'Bản nháp', icon: ShieldQuestion, badge: 'secondary' },
        'not_started': { text: 'Chưa gửi HS', icon: FileX, badge: 'secondary', className: 'bg-muted text-muted-foreground' },
    };
    
    const getUnitName = (communeId?: string) => {
        if (!communeId) return 'Không xác định';
        const unit = units.find(u => u.id === communeId);
        return unit ? unit.name : 'Không xác định';
    }

    const getUserForCommune = (communeId?: string): User | undefined => {
        if (!communeId) return undefined;
        return users.find(u => u.communeId === communeId);
    }
    
    const totalIndicators = useMemo(() => countTotalIndicators(criteria), [criteria]);

    const AssessmentTable = ({ assessmentsToShow, type }: { assessmentsToShow: Assessment[], type: string }) => {
        return (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Tên xã</TableHead>
                    {(type === 'pending_review' || type === 'not_sent') && (
                        <>
                          <TableHead className="hidden md:table-cell">Tên cán bộ</TableHead>
                          <TableHead className="hidden md:table-cell">Số điện thoại</TableHead>
                        </>
                    )}
                    <TableHead className="hidden md:table-cell">Ngày nộp</TableHead>
                    
                    {type === 'not_sent' && (
                       <TableHead className="hidden lg:table-cell">Tiến độ</TableHead>
                    )}
                    {type === 'pending_review' && (
                       <TableHead className="hidden lg:table-cell">Tiến độ</TableHead>
                    )}
                     {(type !== 'not_sent' && type !== 'pending_review') && (
                       <TableHead className="hidden lg:table-cell">Trạng thái</TableHead>
                    )}
                    
                    <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {assessmentsToShow.length > 0 ? (
                    assessmentsToShow.map((assessment) => {
                        const statusInfo = statusMap[assessment.assessmentStatus];
                        const unitName = getUnitName(assessment.communeId);
                        const communeUser = getUserForCommune(assessment.communeId);
                        const progress = calculateProgress(assessment.assessmentData, totalIndicators);

                        return (
                            <TableRow key={assessment.id}>
                                <TableCell>
                                    <div className="font-medium">{unitName}</div>
                                </TableCell>
                                {(type === 'pending_review' || type === 'not_sent') && (
                                    <>
                                        <TableCell className="hidden md:table-cell">{communeUser?.displayName || 'N/A'}</TableCell>
                                        <TableCell className="hidden md:table-cell">{communeUser?.phoneNumber || 'N/A'}</TableCell>
                                    </>
                                )}
                                <TableCell className="hidden md:table-cell">
                                {assessment.assessmentSubmissionDate || 'Chưa nộp'}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    {(type === 'not_sent' || type === 'pending_review') ? (
                                        <div className="flex items-center gap-2">
                                            <Progress value={progress} className="w-[80px] h-2" />
                                            <span className="text-xs text-muted-foreground">{progress}%</span>
                                        </div>
                                    ) : (
                                        statusInfo && (
                                            <Badge variant={statusInfo.badge} className={statusInfo.className}>
                                                <statusInfo.icon className="mr-2 h-4 w-4" />
                                                {statusInfo.text}
                                            </Badge>
                                        )
                                    )}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
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
                    <TableCell colSpan={6} className="h-24 text-center">
                        Không có hồ sơ nào trong mục này.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        );
    };

    const notSentAssessments = useMemo(() => {
        return filteredAssessments.filter(a => a.assessmentStatus === 'not_started' || a.assessmentStatus === 'draft');
    }, [filteredAssessments]);


    const tabs = [
        { value: "pending_review", label: "Chờ duyệt", data: filteredAssessments.filter(a => a.assessmentStatus === 'pending_review') },
        { value: "achieved_standard", label: "Đạt chuẩn", data: filteredAssessments.filter(a => a.assessmentStatus === 'achieved_standard') },
        { value: "returned_for_revision", label: "Yêu cầu Bổ sung", data: filteredAssessments.filter(a => a.assessmentStatus === 'returned_for_revision') },
        { value: "rejected", label: "Không đạt chuẩn", data: filteredAssessments.filter(a => a.assessmentStatus === 'rejected') },
        { value: "not_sent", label: "Chưa gửi HS", data: notSentAssessments },
    ];

    return (
        <>
        <PageHeader title="Duyệt hồ sơ đánh giá" description="Xem xét và phê duyệt các hồ sơ đánh giá do các xã gửi lên theo từng đợt."/>
        <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
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
            <TabsList className="grid w-full grid-cols-5">
                {tabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label} ({tab.data.length})
                    </TabsTrigger>
                ))}
            </TabsList>
            {tabs.map(tab => (
                 <TabsContent key={tab.value} value={tab.value} className="mt-4">
                    <AssessmentTable assessmentsToShow={tab.data} type={tab.value} />
                </TabsContent>
            ))}
            </Tabs>
        </CardContent>
        </Card>
        </>
    );
}
