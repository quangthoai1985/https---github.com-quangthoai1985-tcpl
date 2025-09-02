
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

    const { filteredAssessments } = useMemo(() => {
        if (!selectedPeriod) return { filteredAssessments: [] };
        // We only care about assessments that have passed the registration phase
        const currentPeriodAssessments = assessments.filter(a => 
            a.assessmentPeriodId === selectedPeriod && a.registrationStatus === 'approved'
        );
        return { filteredAssessments: currentPeriodAssessments };
    }, [selectedPeriod, assessments]);

    const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
        'pending_review': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary' },
        'returned_for_revision': { text: 'Yêu cầu Bổ sung', icon: Undo2, badge: 'destructive', className: 'bg-amber-600 hover:bg-amber-700' },
        'rejected': { text: 'Không đạt chuẩn', icon: XCircle, badge: 'destructive' },
        'achieved_standard': { text: 'Đạt chuẩn', icon: Award, badge: 'default', className: 'bg-blue-600' },
        'draft': { text: 'Bản nháp', icon: ShieldQuestion, badge: 'secondary' },
        'not_started': { text: 'Chưa gửi HS', icon: FileX, badge: 'secondary', className: 'bg-muted text-muted-foreground' },
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


    const AssessmentTable = ({ assessmentsToShow }: { assessmentsToShow: Assessment[] }) => {
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
                        const statusInfo = statusMap[assessment.assessmentStatus];
                        const unitName = getUnitName(assessment.communeId);
                        return (
                            <TableRow key={assessment.id}>
                                <TableCell>
                                    <div className="font-medium">{unitName}</div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                {assessment.assessmentSubmissionDate || 'Chưa nộp'}
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
                    <AssessmentTable assessmentsToShow={tab.data} />
                </TabsContent>
            ))}
            </Tabs>
        </CardContent>
        </Card>
        </>
    );
}
