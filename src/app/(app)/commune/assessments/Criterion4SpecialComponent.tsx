

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Info, ListChecks, CornerDownRight } from "lucide-react";
import type { Criterion, Indicator, Content } from "@/lib/data";
import CT4EvidenceUploader from "./CT4EvidenceUploader";
import EvidenceUploaderComponent from "./EvidenceUploaderComponent";
import StatusBadge from "./StatusBadge";
import type { AssessmentValues, FileWithStatus } from "./types";

const Criterion4SpecialComponent = ({ 
    indicator,
    assessmentData,
    onValueChange,
    onNoteChange,
    onEvidenceChange,
    onPreview,
    periodId,
    communeId,
    handleCommuneDocsChange
}: {
    indicator: Indicator;
    assessmentData: AssessmentValues;
    onValueChange: (id: string, value: any, contentId?: string) => void;
    onNoteChange: (id: string, note: string, contentId?: string) => void;
    onEvidenceChange: (id: string, files: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus, contentId?: string) => void;
    onPreview: (file: { name: string; url: string; }) => void;
    periodId: string;
    communeId: string;
    handleCommuneDocsChange: (indicatorId: string, docs: any[]) => void;
}) => {

    const parentData = assessmentData[indicator.id];
    if (!parentData) return <div>Đang tải dữ liệu Chỉ tiêu 4...</div>;

    const content1Config = indicator.contents?.[0];
    const content2Config = indicator.contents?.[1];

    if (!content1Config || !content2Config) return <div className="text-destructive p-4">Lỗi cấu hình: Chỉ tiêu 4 phải có đủ 2 nội dung trong `criteria`.</div>;

    const content1Id = content1Config.id;
    const content2Id = content2Config.id;

    const content1Data = parentData.contentResults?.[content1Id];
    const content2Data = parentData.contentResults?.[content2Id];

    if (!content1Data || !content2Data) return <div>Đang tải dữ liệu nội dung Chỉ tiêu 4...</div>;
    
    const isNotTasked = parentData.isTasked === false;
    
    const assignmentType = indicator.assignmentType || 'specific';

    const [communeDefinedDocs, setCommuneDefinedDocs] = useState(
        () => parentData.communeDefinedDocuments || []
    );

    useEffect(() => {
        if (assignmentType === 'quantity') {
            const adminCount = indicator.assignedDocumentsCount || 0;
            if (adminCount > 0 && communeDefinedDocs.length !== adminCount) {
                const newDocs = Array.from({ length: adminCount }, (_, i) =>
                    communeDefinedDocs[i] || { name: '', issueDate: '', excerpt: '', issuanceDeadlineDays: 30 }
                );
                setCommuneDefinedDocs(newDocs);
            }
        }
    }, [indicator.assignedDocumentsCount, assignmentType, communeDefinedDocs.length]);

    useEffect(() => {
        handleCommuneDocsChange(indicator.id, communeDefinedDocs);
    }, [communeDefinedDocs, indicator.id, handleCommuneDocsChange]);

    const docsToRender = assignmentType === 'specific'
        ? (indicator.documents || [])
        : communeDefinedDocs;

    const handleNoTaskChange = (checked: boolean | 'indeterminate') => {
        const notTasked = checked === true;
        // Logic for handling isTasked change for the whole indicator
        onValueChange(indicator.id, null); // Reset values when task status changes
    };

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
        return indicator.assignedDocumentsCount || docsToRender.length || 0;
    }, [indicator.assignedDocumentsCount, docsToRender.length]);


    const blockClasses = cn(
        "p-4 rounded-lg bg-card shadow-sm border",
        parentData.status === 'achieved' && 'bg-green-50 border-green-200',
        parentData.status === 'not-achieved' && 'bg-red-50 border-red-200',
        parentData.status === 'pending' && 'bg-amber-50 border-amber-200'
    );
    
    const subBlockClasses = (status: 'achieved' | 'not-achieved' | 'pending') => cn(
        "relative pl-6 transition-colors rounded-r-lg py-4 border-l-2 border-dashed",
        status === 'achieved' && 'bg-green-50',
        status === 'not-achieved' && 'bg-red-50',
        status === 'pending' && 'bg-amber-50 border-l-amber-200'
    );

    const handleContent1UploadComplete = (docIndex: number, newFile: { name: string; url: string; }) => {
        onEvidenceChange(indicator.id, [newFile], docIndex, undefined, content1Id);
    };
    const handleContent1AddLink = (docIndex: number, newLink: { name: string; url: string; }) => {
        onEvidenceChange(indicator.id, [newLink], docIndex, undefined, content1Id);
    };
    const handleContent1RemoveFile = (docIndex: number, fileToRemove: FileWithStatus) => {
        onEvidenceChange(indicator.id, [], docIndex, fileToRemove, content1Id);
    };


    return (
        <div className={blockClasses}>
           <div className="flex items-center gap-2">
               <StatusBadge status={parentData.status} />
               <h4 className="font-semibold text-base flex-1">{indicator.name}</h4>
           </div>
            <div className="space-y-8 py-4">
               <div className="grid gap-6">
                   <div className="flex items-center space-x-2">
                        <Checkbox id={`${indicator.id}-notask`} checked={isNotTasked} onCheckedChange={handleNoTaskChange} />
                        <Label htmlFor={`${indicator.id}-notask`} className="font-semibold">Xã không được giao nhiệm vụ ban hành Kế hoạch</Label>
                    </div>

                    {isNotTasked && (
                        <Alert variant="default" className="bg-green-50 border-green-300">
                            <CheckCircle className="h-4 w-4 text-green-600"/>
                            <AlertTitle>Đã xác nhận</AlertTitle>
                            <AlertDescription>
                               Chỉ tiêu này được đánh giá là <strong className="text-green-700">Đạt</strong>.
                            </AlertDescription>
                        </Alert>
                    )}

                    {!isNotTasked && (
                         <div className="space-y-8">
                            {/* KHỐI NỘI DUNG 1 */}
                            <div className={subBlockClasses(content1Data.status)}>
                                <CornerDownRight className="absolute -left-3 top-5 h-5 w-5 text-muted-foreground"/>
                                <div className="flex items-center gap-2 mb-4">
                                    <StatusBadge status={content1Data.status} />
                                    <h5 className="font-semibold text-base flex-1">{content1Config.name}</h5>
                                </div>
                                <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md">
                                    <div className="flex items-start gap-2 text-blue-800">
                                        <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                                        <p className="text-sm">{content1Config.description}</p>
                                    </div>
                                </div>
                                <div className="grid gap-2 mt-4">
                                     <Label className="font-medium">Hồ sơ minh chứng</Label>
                                     <Alert variant="destructive" className="border-amber-500 text-amber-900 bg-amber-50 [&>svg]:text-amber-600">
                                         <AlertTriangle className="h-4 w-4" />
                                         <AlertTitle className="font-semibold text-amber-800">Lưu ý</AlertTitle>
                                         <AlertDescription>Tệp PDF tải lên sẽ được kiểm tra chữ ký số (yêu cầu logic 7 ngày làm việc).</AlertDescription>
                                     </Alert>

                                    {assignmentType === 'quantity' && (!assignedCount || assignedCount === 0) && (
                                        <div className="grid gap-2 p-3 border rounded-md bg-background mt-4">
                                            <Label htmlFor={`communeDocCount-${indicator.id}-${content1Id}`}>Tổng số Kế hoạch đã ban hành</Label>
                                            <Input 
                                                id={`communeDocCount-${indicator.id}-${content1Id}`} 
                                                type="number" 
                                                value={parentData.value || ''}
                                                onChange={(e) => onValueChange(indicator.id, e.target.value)}
                                                placeholder="Nhập số lượng" 
                                                className="w-48"
                                            />
                                        </div>
                                    )}

                                    {docsToRender.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                                            {docsToRender.map((doc, docIndex) => {
                                                const evidence = content1Data.filesPerDocument?.[docIndex] || [];
                                                const isRequired = content1Data.status !== 'pending' && evidence.length === 0 && (assignmentType === 'specific' || Number(parentData.value || 0) > docIndex);

                                                return (
                                                    <div key={docIndex} className="p-3 border rounded-lg grid gap-2 bg-background">
                                                        {assignmentType === 'quantity' && assignedCount === 0 && (
                                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 border-b pb-4">
                                                                 <div className="grid gap-1.5"><Label htmlFor={`doc-name-${indicator.id}-${content1Id}-${docIndex}`} className="text-xs font-semibold">Tên Kế hoạch</Label><Input id={`doc-name-${indicator.id}-${content1Id}-${docIndex}`} value={doc.name} onChange={(e) => handleLocalDocDetailChange(docIndex, 'name', e.target.value)} /></div>
                                                                 <div className="grid gap-1.5"><Label htmlFor={`doc-excerpt-${indicator.id}-${content1Id}-${docIndex}`} className="text-xs font-semibold">Trích yếu</Label><Input id={`doc-excerpt-${indicator.id}-${content1Id}-${docIndex}`} value={doc.excerpt} onChange={(e) => handleLocalDocDetailChange(docIndex, 'excerpt', e.target.value)} /></div>
                                                                 <div className="grid gap-1.5"><Label htmlFor={`doc-issuedate-${indicator.id}-${content1Id}-${docIndex}`} className="text-xs font-semibold">Ngày ban hành (DD/MM/YYYY)</Label><Input id={`doc-issuedate-${indicator.id}-${content1Id}-${docIndex}`} value={doc.issueDate} onChange={(e) => handleLocalDocDetailChange(docIndex, 'issueDate', e.target.value)} /></div>
                                                                 <div className="grid gap-1.5"><Label htmlFor={`doc-deadline-${indicator.id}-${content1Id}-${docIndex}`} className="text-xs font-semibold">Thời hạn (ngày)</Label><Input type="number" id={`doc-deadline-${indicator.id}-${content1Id}-${docIndex}`} value={doc.issuanceDeadlineDays} onChange={(e) => handleLocalDocDetailChange(docIndex, 'issuanceDeadlineDays', Number(e.target.value))} /></div>
                                                             </div>
                                                        )}

                                                        <Label className="font-medium text-center text-sm truncate">Minh chứng cho: <span className="font-bold text-primary">{doc.name || `Kế hoạch ${docIndex + 1}`}</span></Label>
                                                        <CT4EvidenceUploader
                                                            indicatorId={indicator.id}
                                                            contentId={content1Id}
                                                            docIndex={docIndex}
                                                            evidence={evidence}
                                                            onUploadComplete={handleContent1UploadComplete}
                                                            onRemove={handleContent1RemoveFile}
                                                            onAddLink={handleContent1AddLink}
                                                            onPreview={onPreview}
                                                            periodId={periodId}
                                                            communeId={communeId}
                                                            isRequired={isRequired}
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
                                    ) : (assignmentType === 'quantity' && assignedCount === 0) ? 
                                        <p className="text-sm text-muted-foreground">Vui lòng nhập số lượng Kế hoạch đã ban hành ở trên để kê khai chi tiết.</p> 
                                        : <p className="text-sm text-muted-foreground">Admin chưa cấu hình văn bản cụ thể.</p>}
                                </div>

                                <div className="grid gap-2 mt-4">
                                    <Label htmlFor={`note-${indicator.id}-${content1Id}`}>Ghi chú/Giải trình cho Nội dung 1</Label>
                                    <textarea id={`note-${indicator.id}-${content1Id}`} placeholder="Giải trình thêm..." value={content1Data.note || ''} onChange={(e) => onNoteChange(indicator.id, e.target.value, content1Id)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"/>
                                </div>
                            </div>

                            {/* KHỐI NỘI DUNG 2 */}
                             <div className={cn(subBlockClasses(content2Data.status), "mt-8 pt-8 border-t")}>
                                <CornerDownRight className="absolute -left-3 top-[52px] h-5 w-5 text-muted-foreground"/>
                                <div className="flex items-center gap-2 mb-4">
                                    <StatusBadge status={content2Data.status} />
                                    <h5 className="font-semibold text-base flex-1">{content2Config.name}</h5>
                                </div>
                                <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md">
                                    <div className="flex items-start gap-2 text-blue-800">
                                        <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                                        <div>
                                            <p className="text-sm">{content2Config.description}</p>
                                            <p className="text-sm mt-2"><strong>Yêu cầu đạt chuẩn: </strong><span className="font-semibold">{content2Config.standardLevel}</span></p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor={`ct4-c2-total`}>Tổng số nhiệm vụ được giao</Label>
                                        <Input 
                                            id={`ct4-c2-total`} 
                                            type="number" 
                                            placeholder="Nhập tổng số" 
                                            value={content2Data.value?.total || ''}
                                            onChange={(e) => onValueChange(indicator.id, {...content2Data.value, total: e.target.value }, content2Id)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor={`ct4-c2-completed`}>Số nhiệm vụ đã hoàn thành</Label>
                                        <Input 
                                            id={`ct4-c2-completed`} 
                                            type="number" 
                                            placeholder="Nhập số đã hoàn thành"
                                            value={content2Data.value?.completed || ''}
                                            onChange={(e) => onValueChange(indicator.id, {...content2Data.value, completed: e.target.value }, content2Id)}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Label className="text-xs">Tỷ lệ hoàn thành</Label>
                                        <Progress 
                                            value={Number(content2Data.value?.total) > 0 ? (Number(content2Data.value?.completed || 0) / Number(content2Data.value.total)) * 100 : 0} 
                                            className="h-2 mt-1" 
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2 mt-4">
                                    <Label className="font-medium">Hồ sơ minh chứng</Label>
                                    <p className="text-sm text-muted-foreground">{content2Config.evidenceRequirement}</p>
                                    <EvidenceUploaderComponent
                                        indicatorId={indicator.id}
                                        contentId={content2Id}
                                        evidence={content2Data.files || []}
                                        onEvidenceChange={onEvidenceChange}
                                        onPreview={onPreview}
                                        isRequired={content2Data.status === 'not-achieved' && content2Data.files.length === 0}
                                        parentIndicatorId={indicator.id}
                                    />
                                </div>

                                <div className="grid gap-2 mt-4">
                                    <Label htmlFor={`note-${indicator.id}-${content2Id}`}>Ghi chú/Giải trình cho Nội dung 2</Label>
                                    <textarea id={`note-${indicator.id}-${content2Id}`} placeholder="Giải trình thêm..." value={content2Data.note || ''} onChange={(e) => onNoteChange(indicator.id, e.target.value, content2Id)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"/>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Criterion4SpecialComponent;

