'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle, Info, ListChecks } from "lucide-react";
import type { Criterion } from "@/lib/data";
import StatusBadge from "./StatusBadge";
import type { AssessmentValues, FileWithStatus, AssessmentStatus } from "./types";
import TC1IndicatorRenderer from './TC1IndicatorRenderer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Criterion1Component = ({ 
    criterion,
    criterionStatus,
    assessmentData,
    onValueChange,
    onNoteChange,
    onEvidenceChange,
    onIsTaskedChange,
    onPreview,
    periodId,
    communeId,
    handleCommuneDocsChange
}: {
    criterion: Criterion;
    criterionStatus: AssessmentStatus;
    assessmentData: AssessmentValues;
    onValueChange: (id: string, value: any) => void;
    onNoteChange: (id: string, note: string) => void;
    onEvidenceChange: (id: string, files: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus) => void,
    onIsTaskedChange: (id: string, isTasked: boolean) => void;
    onPreview: (file: { name: string; url: string; }) => void;
    periodId: string;
    communeId: string;
    handleCommuneDocsChange: (indicatorId: string, docs: any[]) => void;
}) => {
    const firstIndicatorId = criterion.indicators?.[0]?.id;
    if (!firstIndicatorId || !assessmentData || !assessmentData[firstIndicatorId]) {
         return null;
    }
    const isNotTasked = assessmentData[firstIndicatorId]?.isTasked === false;
    const assignmentType = criterion.assignmentType || 'specific';

    const [communeDefinedDocs, setCommuneDefinedDocs] = useState(
        () => assessmentData[firstIndicatorId]?.communeDefinedDocuments || []
    );

    useEffect(() => {
        if (assignmentType === 'quantity') {
            const adminCount = criterion.assignedDocumentsCount || 0;
            if (adminCount > 0 && communeDefinedDocs.length !== adminCount) {
                const newDocs = Array.from({ length: adminCount }, (_, i) =>
                    communeDefinedDocs[i] || { name: '', issueDate: '', excerpt: '', issuanceDeadlineDays: 7 }
                );
                setCommuneDefinedDocs(newDocs);
            }
        }
    }, [criterion.assignedDocumentsCount, assignmentType, communeDefinedDocs.length]);

    useEffect(() => {
        handleCommuneDocsChange(firstIndicatorId, communeDefinedDocs);
    }, [communeDefinedDocs, firstIndicatorId, handleCommuneDocsChange]);

    const docsToRender = assignmentType === 'specific'
        ? (criterion.documents || [])
        : communeDefinedDocs;

    const handleNoTaskChange = (checked: boolean | 'indeterminate') => {
        const notTasked = checked === true;
        criterion.indicators.forEach(indicator => {
            onIsTaskedChange(indicator.id, !notTasked);
        });
    };
    
    const assignedCount = useMemo(() => {
        return criterion.assignedDocumentsCount || docsToRender.length || 0;
    }, [criterion.assignedDocumentsCount, docsToRender.length]);

     const triggerClasses = cn(
        "font-headline text-lg rounded-md px-4 transition-colors hover:no-underline",
        criterionStatus === 'achieved' && 'bg-green-100 hover:bg-green-200/80',
        criterionStatus === 'not-achieved' && 'bg-red-100 hover:bg-red-200/80',
        criterionStatus === 'pending' && 'bg-amber-100 hover:bg-amber-200/80',
    );


    return (
        <AccordionItem value={criterion.id} key={criterion.id}>
           <AccordionTrigger className={triggerClasses}>
               <div className="flex items-center gap-4 flex-1">
                   <StatusBadge status={criterionStatus} isCriterion={true} />
                   <span className="text-xl font-semibold">Tiêu chí 1: {criterion.name.replace(`Tiêu chí 1: `, '')}</span>
               </div>
           </AccordionTrigger>
           <AccordionContent>
                <div className="space-y-8 pl-4 border-l-2 border-primary/20 ml-2 py-4">
                   <div className="grid gap-6">
                        <div className="flex items-center space-x-2">
                            <Checkbox id={`${criterion.id}-notask`} checked={isNotTasked} onCheckedChange={handleNoTaskChange} />
                            <Label htmlFor={`${criterion.id}-notask`} className="font-semibold">Xã không được giao nhiệm vụ ban hành VBQPPL trong năm</Label>
                        </div>

                        {isNotTasked && (
                            <Alert variant="default" className="bg-green-50 border-green-300">
                                <CheckCircle className="h-4 w-4 text-green-600"/>
                                <AlertTitle>Đã xác nhận</AlertTitle>
                                <AlertDescription>
                                   Toàn bộ các chỉ tiêu của Tiêu chí 1 được đánh giá là <strong className="text-green-700">Đạt</strong>.
                                </AlertDescription>
                            </Alert>
                        )}

                        {!isNotTasked && (
                             <div className="grid gap-8">
                                <Card className="bg-blue-50/50 border border-blue-200">
                                    <CardHeader>
                                        <CardTitle className="text-base text-primary flex items-center gap-2"><ListChecks /> Thông tin nhiệm vụ được giao</CardTitle>
                                        <CardDescription>
                                            {assignmentType === 'specific'
                                                ? "Đây là danh sách các văn bản cụ thể bạn cần ban hành trong kỳ đánh giá này."
                                                : "Vui lòng kê khai thông tin các văn bản đã được ban hành trong kỳ."
                                            }
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                         {assignmentType === 'quantity' && (!criterion.assignedDocumentsCount || criterion.assignedDocumentsCount === 0) && (
                                            <div className="grid gap-2 p-3 border rounded-md bg-background">
                                                <Label htmlFor="communeDocCount">Tổng số VBQPPL đã ban hành</Label>
                                                <Input id="communeDocCount" type="number" value={communeDefinedDocs.length} placeholder="Nhập số lượng" className="w-48"/>
                                            </div>
                                        )}
                                        {docsToRender.length > 0 ? (
                                            <div className="space-y-3">
                                                {docsToRender.map((doc, index) => (
                                                    <div key={index} className="p-3 border-l-4 border-blue-300 rounded-r-md bg-background text-sm">
                                                         <div className="font-semibold text-primary mb-2">Văn bản {index + 1}{doc.name ? `: ${doc.name}`: ''}</div>
                                                         {assignmentType === 'specific' ? (
                                                            <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1">
                                                                <span className="text-muted-foreground">Trích yếu:</span> <span className="font-medium">{doc.excerpt}</span>
                                                                <span className="text-muted-foreground">Ngày ban hành:</span> <span className="font-medium">{doc.issueDate}</span>
                                                                <span className="text-muted-foreground">Thời hạn:</span> <span className="font-medium"><Badge variant="destructive">{doc.issuanceDeadlineDays} ngày</Badge></span>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div className="grid gap-1.5"><Label htmlFor={`doc-name-${index}`}>Tên VBQPPL</Label><Input id={`doc-name-${index}`} value={doc.name} /></div>
                                                                <div className="grid gap-1.5"><Label htmlFor={`doc-excerpt-${index}`}>Trích yếu</Label><Input id={`doc-excerpt-${index}`} value={doc.excerpt} /></div>
                                                                <div className="grid gap-1.5"><Label htmlFor={`doc-issuedate-${index}`}>Ngày ban hành (DD/MM/YYYY)</Label><Input id={`doc-issuedate-${index}`} value={doc.issueDate} /></div>
                                                                <div className="grid gap-1.5"><Label htmlFor={`doc-deadline-${index}`}>Thời hạn (ngày)</Label><Input type="number" id={`doc-deadline-${index}`} value={doc.issuanceDeadlineDays} /></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <p className="text-sm text-muted-foreground">Không có văn bản nào được Admin định danh hoặc xã chưa kê khai.</p>}
                                    </CardContent>
                                </Card>

                                <div className="space-y-12">
                                    {criterion.indicators.map((indicator, indicatorIndex) => {
                                        const data = assessmentData[indicator.id];
                                        if (!data) return <div key={indicator.id}>Đang tải dữ liệu {indicator.name}...</div>;

                                        return (
                                            <TC1IndicatorRenderer
                                                key={indicator.id}
                                                indicator={indicator}
                                                indicatorIndex={indicatorIndex}
                                                data={data}
                                                docsToRender={docsToRender}
                                                assignedCount={assignedCount}
                                                onValueChange={onValueChange}
                                                onNoteChange={onNoteChange}
                                                onEvidenceChange={onEvidenceChange}
                                                onPreview={onPreview}
                                                periodId={periodId}
                                                communeId={communeId}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
           </AccordionContent>
        </AccordionItem>
    );
};

export default Criterion1Component;
