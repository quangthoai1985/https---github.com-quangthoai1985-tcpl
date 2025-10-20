
'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Info, ListChecks } from "lucide-react";
import type { Criterion } from "@/lib/data";
import Criterion1EvidenceUploader from "./Criterion1EvidenceUploader";
import EvidenceUploaderComponent from "./EvidenceUploaderComponent";
import StatusBadge from "./StatusBadge";
import type { AssessmentValues, FileWithStatus } from "./types";

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
    criterionStatus: 'achieved' | 'not-achieved' | 'pending';
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
    const firstIndicatorId = criterion.indicators[0]?.id;
    if (!firstIndicatorId || !assessmentData[firstIndicatorId]) return null;

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
                    communeDefinedDocs[i] || { name: '', issueDate: '', excerpt: '', issuanceDeadlineDays: 30 }
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

    const handleUploadComplete = useCallback((indicatorId: string, docIndex: number, newFile: { name: string; url: string; }) => {
        onEvidenceChange(indicatorId, [newFile], docIndex);
    }, [onEvidenceChange]);

    const handleAddLink = useCallback((indicatorId: string, docIndex: number, newLink: { name: string; url: string; }) => {
        onEvidenceChange(indicatorId, [newLink], docIndex);
    }, [onEvidenceChange]);


    const handleRemoveFile = useCallback((indicatorId: string, docIndex: number, fileToRemove: FileWithStatus) => {
        onEvidenceChange(indicatorId, [], docIndex, fileToRemove);
    }, [onEvidenceChange]);

    const handleLocalDocCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = Math.max(0, Number(e.target.value));
        const newDocs = Array.from({ length: count }, (_, i) =>
            communeDefinedDocs[i] || { name: '', issueDate: '', excerpt: '', issuanceDeadlineDays: 30 }
        );
        setCommuneDefinedDocs(newDocs);
    };

    const handleLocalDocDetailChange = (index: number, field: string, value: string | number) => {
        const newDocs = [...communeDefinedDocs];
        if(newDocs[index]) {
            (newDocs[index] as any)[field] = value;
            setCommuneDefinedDocs(newDocs);
        }
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
                                                <Input id="communeDocCount" type="number" value={communeDefinedDocs.length} onChange={handleLocalDocCountChange} placeholder="Nhập số lượng" className="w-48"/>
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
                                                                <div className="grid gap-1.5"><Label htmlFor={`doc-name-${index}`}>Tên VBQPPL</Label><Input id={`doc-name-${index}`} value={doc.name} onChange={(e) => handleLocalDocDetailChange(index, 'name', e.target.value)} /></div>
                                                                <div className="grid gap-1.5"><Label htmlFor={`doc-excerpt-${index}`}>Trích yếu</Label><Input id={`doc-excerpt-${index}`} value={doc.excerpt} onChange={(e) => handleLocalDocDetailChange(index, 'excerpt', e.target.value)} /></div>
                                                                <div className="grid gap-1.5"><Label htmlFor={`doc-issuedate-${index}`}>Ngày ban hành (DD/MM/YYYY)</Label><Input id={`doc-issuedate-${index}`} value={doc.issueDate} onChange={(e) => handleLocalDocDetailChange(index, 'issueDate', e.target.value)} /></div>
                                                                <div className="grid gap-1.5"><Label htmlFor={`doc-deadline-${index}`}>Thời hạn (ngày)</Label><Input type="number" id={`doc-deadline-${index}`} value={doc.issuanceDeadlineDays} onChange={(e) => handleLocalDocDetailChange(index, 'issuanceDeadlineDays', Number(e.target.value))} /></div>
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
                                        if (!data) return <div key={indicator.id}>Đang tải...</div>;
                                        
                                        const content = indicator.contents?.[0];
                                        if (!content) return null;

                                        const valueAsNumber = Number(data.value);
                                        const progress = assignedCount > 0 && !isNaN(valueAsNumber) ? Math.round((valueAsNumber / assignedCount) * 100) : 0;
                                        const progressColor = progress >= 100 ? "bg-green-500" : "bg-yellow-500";

                                        const blockClasses = cn(
                                            "p-4 rounded-lg bg-card shadow-sm border",
                                            data.status === 'achieved' && 'bg-green-50 border-green-200',
                                            data.status === 'not-achieved' && 'bg-red-50 border-red-200',
                                            data.status === 'pending' && 'bg-amber-50 border-amber-200'
                                        );

                                        return (
                                             <div key={indicator.id} className={blockClasses}>
                                                <div className="flex items-center gap-2">
                                                  <StatusBadge status={data.status} />
                                                  <h4 className="font-semibold text-base flex-1">{content.name}</h4>
                                                </div>
                                                
                                                 <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md mt-3">
                                                    <div className="flex items-start gap-2 text-blue-800">
                                                        <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                                                        <div>
                                                            <p className="text-sm">{content.description}</p>
                                                            <p className="text-sm mt-2"><strong>Yêu cầu đạt chuẩn: </strong><span className="font-semibold">{content.standardLevel}</span></p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid gap-2 mt-4">
                                                  <div className="flex items-center gap-4">
                                                    <Label htmlFor={`${indicator.id}-input`} className="shrink-0">
                                                        {indicatorIndex === 0 && "Tổng số VBQPPL đã ban hành:"}
                                                        {indicatorIndex === 1 && "Tổng số dự thảo được truyền thông:"}
                                                        {indicatorIndex === 2 && "Tổng số VBQPPL được tự kiểm tra:"}
                                                    </Label>
                                                    <Input
                                                        id={`${indicator.id}-input`}
                                                        type="number"
                                                        placeholder="Số lượng"
                                                        className="w-28"
                                                        value={typeof data.value === 'object' ? '' : (data.value || '')}
                                                        onChange={(e) => onValueChange(indicator.id, e.target.value)}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <Label htmlFor={`progress-${indicator.id}`} className="text-xs font-normal">Tiến độ đạt chuẩn (so với {assignedCount} được giao)</Label>
                                                            <span className="text-xs font-semibold">{progress.toFixed(0)}%</span>
                                                        </div>
                                                        <Progress id={`progress-${indicator.id}`} value={progress} indicatorClassName={progressColor} className="h-2"/>
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="grid gap-2 mt-4">
    <Label className="font-medium">Hồ sơ minh chứng</Label>
    <p className="text-sm text-muted-foreground">{content.evidenceRequirement || 'Không yêu cầu cụ thể.'}</p>
    
    {indicatorIndex === 0 ? (
        // START: Logic cho Chỉ tiêu 1.1 (index 0)
        <>
            <Alert variant="destructive" className="border-amber-500 text-amber-900 bg-amber-50 [&>svg]:text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="font-semibold text-amber-800">Lưu ý quan trọng</AlertTitle>
                <AlertDescription>Các tệp PDF được tải lên sẽ được hệ thống tự động kiểm tra chữ ký số.</AlertDescription>
            </Alert>

            {docsToRender.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                    {docsToRender.map((doc, docIndex) => {
                        const evidence = data.filesPerDocument?.[docIndex] || [];
                        const isRequired = data.status !== 'pending' && data.isTasked !== false && evidence.length === 0 && Number(data.value) > docIndex;

                        return (
                            <div key={docIndex} className="p-3 border rounded-lg grid gap-2 bg-background">
                                <Label className="font-medium text-center text-sm truncate">Minh chứng cho: <span className="font-bold text-primary">{doc.name || `Văn bản ${docIndex + 1}`}</span></Label>
                                <Criterion1EvidenceUploader 
                                    indicatorId={indicator.id} 
                                    docIndex={docIndex} 
                                    evidence={evidence} 
                                    onUploadComplete={handleUploadComplete} 
                                    onRemove={handleRemoveFile} 
                                    onAddLink={handleAddLink}
                                    onPreview={onPreview} 
                                    periodId={periodId} 
                                    communeId={communeId} 
                                    accept=".pdf"
                                />
                                {isRequired && (
                                    <p className="text-sm font-medium text-destructive mt-1">
                                        Yêu cầu ít nhất một minh chứng.
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : <p className="text-sm text-muted-foreground">Vui lòng kê khai thông tin văn bản ở trên để tải lên minh chứng.</p>}
        </>
        // END: Logic cho Chỉ tiêu 1.1 (index 0)
    ) : (
        // START: Logic cho Chỉ tiêu 1.2 và 1.3 (index > 0)
        <EvidenceUploaderComponent 
            indicatorId={indicator.id} 
            evidence={data.files} 
            onEvidenceChange={onEvidenceChange} 
            onPreview={onPreview} 
            isRequired={data.status !== 'pending' && data.isTasked !== false && data.files.length === 0}
        />
        // END: Logic cho Chỉ tiêu 1.2 và 1.3 (index > 0)
    )}
</div>

                                                <div className="grid gap-2 mt-4">
                                                    <Label htmlFor={`note-${indicator.id}`}>Ghi chú/Giải trình</Label>
                                                    <textarea id={`note-${indicator.id}`} placeholder="Giải trình thêm..." value={data.note} onChange={(e) => onNoteChange(indicator.id, e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"/>
                                                </div>
                                            </div>
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
