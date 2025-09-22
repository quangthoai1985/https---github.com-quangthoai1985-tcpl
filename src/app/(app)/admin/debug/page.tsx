
'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Bug } from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { Criterion, Assessment } from '@/lib/data';

export default function DebugPage() {
    const { role, criteria, assessments, loading, updateCriteria, updateSingleAssessment } = useData();
    const { toast } = useToast();
    const [view, setView] = useState<'criteria' | 'assessments'>('criteria');

    const handleTestUpdateCriteria = async () => {
        if (criteria.length === 0) {
            toast({ variant: 'destructive', title: 'Không có tiêu chí để thử nghiệm' });
            return;
        }
        
        // Chọn tiêu chí và chỉ tiêu đầu tiên để thử nghiệm
        const newCriteria: Criterion[] = JSON.parse(JSON.stringify(criteria));
        const targetCriterion = newCriteria.find(c => c.indicators && c.indicators.length > 0);
        if (!targetCriterion || !targetCriterion.indicators[0]) {
             toast({ variant: 'destructive', title: 'Không tìm thấy chỉ tiêu phù hợp để thử nghiệm' });
            return;
        }
        
        const targetIndicator = targetCriterion.indicators[0];
        if (!targetIndicator.contents) {
            targetIndicator.contents = [];
        }

        const newContent = {
            id: `DBG_CNT_${Date.now()}`,
            name: `Nội dung Test ${new Date().toLocaleTimeString()}`,
            description: 'Đây là nội dung được thêm tự động để test.',
            inputType: 'boolean' as const,
            standardLevel: 'Đạt',
            evidenceRequirement: 'Không cần minh chứng cho test.'
        };
        
        targetIndicator.contents.push(newContent);
        
        try {
            toast({ title: 'Đang gửi cập nhật tiêu chí...' });
            await updateCriteria(newCriteria);
            toast({ title: 'Thành công!', description: `Đã thêm nội dung test vào chỉ tiêu: ${targetIndicator.name}` });
        } catch (error) {
            console.error("Test update criteria failed:", error);
            toast({ variant: 'destructive', title: 'Cập nhật tiêu chí thất bại' });
        }
    };

    const handleTestUpdateAssessment = async () => {
        if (assessments.length === 0) {
            toast({ variant: 'destructive', title: 'Không có hồ sơ đánh giá để thử nghiệm' });
            return;
        }
        
        // Chọn hồ sơ đầu tiên
        const targetAssessment = assessments[0];
        const newAssessment: Assessment = JSON.parse(JSON.stringify(targetAssessment));

        // Tìm một chỉ tiêu có 'contents' để test
        const indicatorWithContents = criteria.flatMap(c => c.indicators).find(i => i.contents && i.contents.length > 0);
        
        if (!indicatorWithContents || !indicatorWithContents.contents || indicatorWithContents.contents.length === 0) {
            toast({ variant: 'destructive', title: 'Không tìm thấy chỉ tiêu nào có "contents" để test' });
            return;
        }
        
        const indicatorId = indicatorWithContents.id;
        const contentId = indicatorWithContents.contents[0].id;

        if (!newAssessment.assessmentData) {
            newAssessment.assessmentData = {};
        }
        if (!newAssessment.assessmentData[indicatorId]) {
             newAssessment.assessmentData[indicatorId] = { value: null, files: [], note: '', status: 'pending' };
        }
         if (!newAssessment.assessmentData[indicatorId].contentResults) {
            newAssessment.assessmentData[indicatorId].contentResults = {};
        }

        const newContentResult = {
            value: true,
            files: [{ name: "test_file.pdf", url: "https://example.com/test.pdf" }],
            status: 'achieved' as const,
            note: `Cập nhật lúc ${new Date().toLocaleTimeString()}`
        };

        newAssessment.assessmentData[indicatorId].contentResults![contentId] = newContentResult;

        try {
            toast({ title: 'Đang gửi cập nhật hồ sơ...' });
            await updateSingleAssessment(newAssessment);
            toast({ title: 'Thành công!', description: `Đã cập nhật nội dung test cho hồ sơ: ${newAssessment.id}` });
        } catch (error) {
            console.error("Test update assessment failed:", error);
            toast({ variant: 'destructive', title: 'Cập nhật hồ sơ thất bại' });
        }
    };

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (role !== 'admin') {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Truy cập bị từ chối</AlertTitle>
                <AlertDescription>
                    Bạn không có quyền truy cập trang này.
                </AlertDescription>
            </Alert>
        );
    }
    
    const dataToShow = view === 'criteria' ? criteria : assessments;

    return (
        <>
            <PageHeader
                title="Trang Gỡ lỗi DataContext"
                description="Kiểm tra dữ liệu được tải theo thời gian thực từ Firestore."
            />
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bug /> Bảng điều khiển</CardTitle>
                    <CardDescription>Sử dụng các nút bên dưới để thực hiện các hành động test và quan sát sự thay đổi dữ liệu JSON bên dưới.</CardDescription>
                     <div className="flex gap-2 pt-2">
                        <Button onClick={handleTestUpdateCriteria}>Test: Cập nhật Criteria</Button>
                        <Button onClick={handleTestUpdateAssessment}>Test: Cập nhật Assessment</Button>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                             <CardTitle>Dữ liệu JSON thô</CardTitle>
                             <CardDescription>Dữ liệu được lấy trực tiếp từ `useDataContext`.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant={view === 'criteria' ? 'default' : 'outline'} onClick={() => setView('criteria')}>
                                Criteria ({criteria.length})
                            </Button>
                            <Button variant={view === 'assessments' ? 'default' : 'outline'} onClick={() => setView('assessments')}>
                                Assessments ({assessments.length})
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[600px] w-full rounded-md border p-4 bg-muted/50">
                        <pre className="text-xs">
                            <code>{JSON.stringify(dataToShow, null, 2)}</code>
                        </pre>
                    </ScrollArea>
                </CardContent>
            </Card>
        </>
    );
}
