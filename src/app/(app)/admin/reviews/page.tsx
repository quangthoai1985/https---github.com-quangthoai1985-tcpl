
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
import { Eye, CheckCircle, XCircle, Clock, FileX, ShieldQuestion, Award } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React, { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Assessment, Unit } from '@/lib/data';
import PageHeader from '@/components/layout/page-header';
import { useToast } from '@/hooks/use-toast';

export default function ReviewAssessmentsPage() {
    const { assessmentPeriods, units, assessments, users, updateAssessments, currentUser } = useData();
    const { toast } = useToast();

    const [selectedPeriod, setSelectedPeriod] = React.useState<string | undefined>(
        assessmentPeriods.find(p => p.isActive)?.id
    );

    const { filteredAssessments, notSentCommunes } = useMemo(() => {
        if (!selectedPeriod) return { filteredAssessments: [], notSentCommunes: [] };

        const currentPeriodAssessments = assessments.filter(a => a.assessmentPeriodId === selectedPeriod);
        
        // Find units that have their registration approved
        const approvedRegistrationCommuneIds = new Set(
            currentPeriodAssessments
                .filter(a => ['registration_approved', 'pending_review', 'approved', 'rejected', 'achieved_standard'].includes(a.status))
                .map(a => a.communeId)
        );

        // From those units, find the ones that haven't submitted their self-assessment yet
        // Their status would still be 'registration_approved'
        const notSentAssessments = currentPeriodAssessments.filter(a => a.status === 'registration_approved');

        const notSentCommuneUnits = units.filter(u => notSentAssessments.some(a => a.communeId === u.id));

        return { filteredAssessments: currentPeriodAssessments, notSentCommunes: notSentCommuneUnits };
    }, [selectedPeriod, units, assessments]);
    
    const handleRecognizeAchievement = async (assessment: Assessment) => {
        if (!currentUser) return;
        
        const updatedAssessment = {
            ...assessment,
            status: 'achieved_standard' as const,
            achievementDate: new Date().toLocaleDateString('vi-VN'),
            recognizerId: currentUser.id,
        };

        await updateAssessments(assessments.map(a => a.id === assessment.id ? updatedAssessment : a));
        
        toast({
            title: "Công nhận thành công!",
            description: `Đã công nhận ${getUnitName(assessment.communeId).communeName} đạt chuẩn tiếp cận pháp luật.`
        });
    };

    const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
        'approved': { text: 'Đã duyệt', icon: CheckCircle, badge: 'default', className: 'bg-green-600' },
        'pending_review': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary' },
        'rejected': { text: 'Đã trả lại', icon: XCircle, badge: 'destructive' },
        'draft': { text: 'Bản nháp', icon: ShieldQuestion, badge: 'secondary' },
        'not_sent': { text: 'Chưa gửi HS', icon: FileX, badge: 'secondary', className: 'bg-muted text-muted-foreground' },
        'achieved_standard': { text: 'Đạt chuẩn', icon: Award, badge: 'default', className: 'bg-blue-600' }
    };
    
    const getUnitName = (communeId?: string) => {
        if (!communeId) return { communeName: 'Không xác định', districtName: '', provinceName: '' };
        
        const unit = units.find(u => u.id === communeId);
        if (!unit) return { communeName: 'Không xác định', districtName: '', provinceName: '' };
        
        if (unit.type === 'province') {
            return { communeName: unit.name, districtName: '', provinceName: '' };
        }
        
        const district = units.find(u => u.id === unit.parentId);
        if (!district) return { communeName: unit.name, districtName: 'Không xác định', provinceName: '' };

        const province = units.find(u => u.id === district.parentId);

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
                        <TableHead>Tên cán bộ</TableHead>
                        <TableHead>Số điện thoại</TableHead>
                        <TableHead>Trạng thái</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {(assessmentsToShow as Unit[]).length > 0 ? (
                        (assessmentsToShow as Unit[]).map((unit) => {
                            const statusInfo = statusMap['not_sent'];
                            const responsibleUser = users.find(u => u.communeId === unit.id);
                            return (
                                <TableRow key={unit.id}>
                                    <TableCell>
                                        <div className="font-medium">{unit.name}</div>
                                    </TableCell>
                                    <TableCell>{responsibleUser?.displayName || 'Chưa có'}</TableCell>
                                    <TableCell>{responsibleUser?.phoneNumber || 'Chưa có'}</TableCell>
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
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/admin/reviews/${assessment.id}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Xem chi tiết
                                        </Link>
                                    </Button>
                                    {assessment.status === 'approved' && (
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleRecognizeAchievement(assessment)}>
                                            <Award className="mr-2 h-4 w-4"/> Công nhận đạt chuẩn
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

    const tabs = [
        { value: "pending_review", label: "Chờ duyệt", data: filteredAssessments.filter(a => a.status === 'pending_review') },
        { value: "approved", label: "Đã duyệt", data: filteredAssessments.filter(a => a.status === 'approved') },
        { value: "achieved_standard", label: "Đã đạt chuẩn", data: filteredAssessments.filter(a => a.status === 'achieved_standard') },
        { value: "rejected", label: "Đã trả lại", data: filteredAssessments.filter(a => a.status === 'rejected') },
        { value: "not_sent", label: "Chưa gửi HS", data: notSentCommunes },
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
                 <TabsContent key={tab.value} value={tab.value}>
                    <AssessmentTable assessmentsToShow={tab.data} status={tab.value} />
                </TabsContent>
            ))}
            </Tabs>
        </CardContent>
        </Card>
        </>
    );
}
