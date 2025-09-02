
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
import type { Assessment, Unit, Criterion } from '@/lib/data';
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

export default function ReviewAssessmentsPage() {
    const { assessmentPeriods, units, assessments, users, updateAssessments, currentUser, criteria } = useData();
    const { toast } = useToast();

    const [selectedPeriod, setSelectedPeriod] = React.useState<string | undefined>(
        assessmentPeriods.find(p => p.isActive)?.id
    );
    const [actionTarget, setActionTarget] = useState<Assessment | null>(null);

    const { filteredAssessments } = useMemo(() => {
        if (!selectedPeriod) return { filteredAssessments: [] };
        const currentPeriodAssessments = assessments.filter(a => a.assessmentPeriodId === selectedPeriod);
        return { filteredAssessments: currentPeriodAssessments };
    }, [selectedPeriod, assessments]);
    
    const handleReturnForRevision = async () => {
        if (!actionTarget) {
            return;
        }
        
        const updatedAssessment = { 
            ...actionTarget, 
            status: 'returned_for_revision' as const, 
        };
        
        await updateAssessments(
            assessments.map((a) => (a.id === actionTarget.id ? updatedAssessment : a))
        );

        toast({
            title: 'Đã trả lại hồ sơ',
            description: `Đã gửi yêu cầu bổ sung cho ${getUnitName(actionTarget.communeId)}.`,
        });
        
        setActionTarget(null);
    };

    const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
        'pending_review': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary' },
        'returned_for_revision': { text: 'Yêu cầu Bổ sung', icon: Undo2, badge: 'destructive', className: 'bg-amber-600 hover:bg-amber-700' },
        'rejected': { text: 'Không đạt chuẩn', icon: XCircle, badge: 'destructive' },
        'draft': { text: 'Bản nháp', icon: ShieldQuestion, badge: 'secondary' },
        'not_sent': { text: 'Chưa gửi HS', icon: FileX, badge: 'secondary', className: 'bg-muted text-muted-foreground' },
        'achieved_standard': { text: 'Đạt chuẩn', icon: Award, badge: 'default', className: 'bg-blue-600' },
    };
    
    const getUnitName = (communeId?: string) => {
        if (!communeId) return 'Không xác định';
        const unit = units.find(u => u.id === communeId);
        return unit ? unit.name : 'Không xác định';
    }
    
    const totalIndicators = useMemo(() => countTotalIndicators(criteria), [criteria]);

    const calculateProgress = (assessment: Assessment | undefined): number => {
        if (!assessment?.assessmentData || totalIndicators === 0) {
            return 0;
        }
        const assessedCount = Object.keys(assessment.assessmentData).length;
        
        return Math.round((assessedCount / totalIndicators) * 100);
    };


    const AssessmentTable = ({ assessmentsToShow, status }: { assessmentsToShow: Assessment[], status: string }) => {
        if (status === 'not_sent') {
            return (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tên đơn vị</TableHead>
                            <TableHead>Tên cán bộ</TableHead>
                            <TableHead>Số điện thoại</TableHead>
                            <TableHead className="text-right">Tiến độ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {assessmentsToShow.length > 0 ? (
                        assessmentsToShow.map((assessment) => {
                            const unit = units.find(u => u.id === assessment.communeId);
                            if (!unit) return null;

                            const progress = calculateProgress(assessment);
                            const responsibleUser = users.find(u => u.communeId === unit.id);
                            const progressColor = progress < 30 ? 'bg-red-500' : progress < 70 ? 'bg-amber-500' : 'bg-green-500';
                            return (
                                <TableRow key={unit.id}>
                                    <TableCell>
                                        <div className="font-medium">{unit.name}</div>
                                    </TableCell>
                                    <TableCell>{responsibleUser?.displayName || 'Chưa có'}</TableCell>
                                    <TableCell>{responsibleUser?.phoneNumber || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Progress value={progress} className="w-32 h-2" indicatorClassName={progressColor} />
                                            <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            Không có đơn vị nào đã được duyệt ĐK nhưng chưa gửi hồ sơ.
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
                {assessmentsToShow.length > 0 ? (
                    assessmentsToShow.map((assessment) => {
                        const statusInfo = statusMap[assessment.status];
                        const unitName = getUnitName(assessment.communeId);
                        return (
                            <TableRow key={assessment.id}>
                                <TableCell>
                                    <div className="font-medium">{unitName}</div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                {assessment.submissionDate}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    {statusInfo && (
                                        <Badge variant={statusInfo.badge} className={statusInfo.className}>
                                            <statusInfo.icon className="mr-2 h-4 w-4" />
                                            {statusInfo.text}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/admin/reviews/${assessment.id}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Xem chi tiết
                                        </Link>
                                    </Button>
                                    {assessment.status === 'pending_review' && (
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-amber-600 border-amber-500 hover:bg-amber-50 hover:text-amber-700"
                                            onClick={() => setActionTarget(assessment)}
                                        >
                                            <Undo2 className="mr-2 h-4 w-4"/> Trả lại
                                        </Button>
                                    )}
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

    const notSentAssessments = useMemo(() => {
        return filteredAssessments.filter(a => a.status === 'registration_approved' || a.status === 'draft');
    }, [filteredAssessments]);


    const tabs = [
        { value: "pending_review", label: "Chờ duyệt", data: filteredAssessments.filter(a => a.status === 'pending_review') },
        { value: "achieved_standard", label: "Đạt chuẩn", data: filteredAssessments.filter(a => a.status === 'achieved_standard') },
        { value: "returned_for_revision", label: "Yêu cầu Bổ sung", data: filteredAssessments.filter(a => a.status === 'returned_for_revision') },
        { value: "rejected", label: "Không đạt chuẩn", data: filteredAssessments.filter(a => a.status === 'rejected') },
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
                    <AssessmentTable assessmentsToShow={tab.data} status={tab.value} />
                </TabsContent>
            ))}
            </Tabs>
        </CardContent>
        </Card>

        <AlertDialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận trả lại hồ sơ?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Hành động này sẽ trả lại hồ sơ cho đơn vị <strong>{getUnitName(actionTarget?.communeId)}</strong> để họ chỉnh sửa và bổ sung.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setActionTarget(null)}>Hủy</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleReturnForRevision}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                    Xác nhận Trả lại
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
