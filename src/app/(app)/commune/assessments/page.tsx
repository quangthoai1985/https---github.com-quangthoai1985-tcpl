
'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, File as FileIcon, X, CornerDownRight, CheckCircle, XCircle, CircleSlash, Loader2, LinkIcon, Info, AlertTriangle, FileUp, ListChecks, Eye, Download } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/context/DataContext";
import PageHeader from "@/components/layout/page-header";
import type { Indicator, SubIndicator, Criterion, Assessment, IndicatorResult, Content } from "@/lib/data";
import { Textarea } from "@/components/ui/textarea";
import { getDownloadURL, ref, uploadBytes, getBlob } from "firebase/storage";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type AssessmentStatus = 'achieved' | 'not-achieved' | 'pending';
type FileWithStatus = (File | {
    name: string, 
    url: string,
    signatureStatus?: 'validating' | 'valid' | 'invalid' | 'error',
    signatureError?: string,
    contentCheckStatus?: 'passed' | 'failed' | 'not_checked',
    contentCheckIssues?: string[]
});

type IndicatorValue = {
    isTasked?: boolean | null;
    value: any;
    files: FileWithStatus[];
    filesPerDocument?: { [documentIndex: number]: FileWithStatus[] };
    note: string;
    status: AssessmentStatus;
    adminNote?: string;
    communeNote?: string;
    communeDefinedDocuments?: {
        name: string;
        issueDate: string;
        excerpt: string;
        issuanceDeadlineDays: number;
    }[];
    contentResults?: {
        [contentId: string]: {
            value: any,
            files: FileWithStatus[],
            status: AssessmentStatus,
            note?: string 
        } 
    };
    meta?: { 
        metCount?: number, 
        totalCount?: number, 
        computedAt?: string 
    };
};
type AssessmentValues = Record<string, IndicatorValue>;

const Criterion1EvidenceUploader = ({
  indicatorId,
  docIndex,
  evidence,
  onUploadComplete,
  onRemove,
  onPreview,
  periodId,
  communeId,
  accept,
}: {
  indicatorId: string;
  docIndex: number;
  evidence: FileWithStatus[];
  onUploadComplete: (indicatorId: string, docIndex: number, newFile: { name: string, url: string }) => void;
  onRemove: (indicatorId: string, docIndex: number, fileToRemove: FileWithStatus) => void;
  onPreview: (file: { name: string; url: string; }) => void;
  periodId: string;
  communeId: string;
  accept?: string;
}) => {
    const { storage } = useData();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !storage) return;

        setIsUploading(true);

        const { dismiss } = toast;
        const loadingToastId = toast({
            title: 'Đang tải lên...',
            description: `Đang xử lý tệp "${file.name}".`,
        }).id;

        try {
            const filePath = `hoso/${communeId}/evidence/${periodId}/${indicatorId}/${docIndex}/${file.name}`;
            const storageRef = ref(storage, filePath);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            onUploadComplete(indicatorId, docIndex, { name: file.name, url: downloadURL });
            
            dismiss(loadingToastId);

            toast({
                title: 'Tải lên thành công!',
                description: `Tệp "${file.name}" đã được tải lên và đang được kiểm tra.`,
                variant: 'default',
                duration: 5000,
            });

        } catch (error) {
            console.error("Upload error for criterion 1:", error);

            dismiss(loadingToastId);

            toast({
                title: 'Lỗi tải lên',
                description: `Đã xảy ra lỗi khi tải tệp "${file.name}".`,
                variant: 'destructive',
                duration: 5000,
            });
        } finally {
            setIsUploading(false);
        }
    };

    const getStatusIcon = (file: FileWithStatus) => {
        if (!('signatureStatus' in file)) return null;
        switch (file.signatureStatus) {
            case 'validating': return <TooltipTrigger asChild><Loader2 className="h-4 w-4 text-amber-500 animate-spin" /></TooltipTrigger>;
            case 'valid': return <TooltipTrigger asChild><CheckCircle className="h-4 w-4 text-green-500" /></TooltipTrigger>;
            case 'invalid':
            case 'error': return <TooltipTrigger asChild><XCircle className="h-4 w-4 text-red-500" /></TooltipTrigger>;
            default: return null;
        }
    };

    const getStatusTooltip = (file: FileWithStatus) => {
        if (!('signatureStatus' in file)) return null;
        switch (file.signatureStatus) {
            case 'validating': return "Đang kiểm tra chữ ký số...";
            case 'valid': return "Chữ ký số hợp lệ.";
            case 'invalid': return `Chữ ký không hợp lệ: ${file.signatureError || 'Lỗi không xác định.'}`;
            case 'error': return `Lỗi xử lý tệp: ${file.signatureError || 'Không thể đọc chữ ký.'}`;
            default: return null;
        }
    };
    
    const renderStatusBadge = (file: FileWithStatus) => {
        if (!('signatureStatus' in file) || file.signatureStatus === 'validating') {
            return null;
        }

        switch (file.signatureStatus) {
            case 'valid':
                return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white mt-1.5 w-fit">Hợp lệ</Badge>;
            case 'invalid':
                return <Badge variant="destructive" className="mt-1.5 w-fit">{file.signatureError || 'Không hợp lệ'}</Badge>;
            case 'error':
                return <Badge variant="destructive" className="mt-1.5 w-fit">{file.signatureError || 'Lỗi xử lý'}</Badge>;
            default:
                return null;
        }
    };


    return (
        <div className="space-y-2">
            <div className="w-full relative border border-dashed rounded-lg p-2 text-center hover:border-primary transition-colors">
                 <UploadCloud className="mx-auto h-6 w-6 text-muted-foreground" />
                 <p className="mt-1 text-xs text-muted-foreground">Tải lên tệp PDF</p>
                 <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileSelect} accept={accept} disabled={isUploading} />
                 {isUploading && <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 animate-spin" />}
            </div>
             {evidence.map((file, index) => (
                <div key={index} className="flex flex-col gap-1 p-1.5 bg-muted rounded-md text-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 w-0 flex-1 min-w-0">
                             <TooltipProvider>
                                <Tooltip>
                                    {getStatusIcon(file)}
                                    <TooltipContent>
                                        <p>{getStatusTooltip(file)}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <span className="truncate text-xs flex-1">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            { 'url' in file && file.url && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onPreview(file as { name: string, url: string })}>
                                    <Eye className="h-4 w-4" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(indicatorId, docIndex, file)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    {renderStatusBadge(file)}
                </div>
            ))}
        </div>
    );
};

const Criterion1Assessment = ({ criterion, assessmentData, onValueChange, onNoteChange, onEvidenceChange, onIsTaskedChange, onPreview, periodId, communeId, handleCommuneDocsChange }: {
    criterion: Criterion;
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

    const [communeDefinedDocs, setCommuneDefinedDocs] = React.useState(
        () => assessmentData[firstIndicatorId]?.communeDefinedDocuments || []
    );

    React.useEffect(() => {
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

    React.useEffect(() => {
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


    return (
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
                                                                    <Criterion1EvidenceUploader indicatorId={indicator.id} docIndex={docIndex} evidence={evidence} onUploadComplete={handleUploadComplete} onRemove={handleRemoveFile} onPreview={onPreview} periodId={periodId} communeId={communeId} accept=".pdf"/>
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
                                        ) : (
                                            <EvidenceUploaderComponent indicatorId={indicator.id} evidence={data.files} onEvidenceChange={onEvidenceChange} onPreview={onPreview} isRequired={data.status !== 'pending' && data.isTasked !== false && data.files.length === 0}/>
                                        )}
                                    </div>

                                    <div className="grid gap-2 mt-4">
                                        <Label htmlFor={`note-${indicator.id}`}>Ghi chú/Giải trình</Label>
                                        <Textarea id={`note-${indicator.id}`} placeholder="Giải trình thêm..." value={data.note} onChange={(e) => onNoteChange(indicator.id, e.target.value)}/>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const EvidenceUploaderComponent = ({ indicatorId, evidence, onEvidenceChange, isRequired, onPreview, docIndex, accept, contentId }: {
    indicatorId: string;
    evidence: FileWithStatus[];
    onEvidenceChange: (id: string, files: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus, contentId?: string) => void;
    isRequired: boolean;
    onPreview: (file: { name: string, url: string }) => void;
    docIndex?: number;
    accept?: string;
    contentId?: string;
}) => {
    const [linkInput, setLinkInput] = useState('');
    const { toast } = useToast();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files || []);
        onEvidenceChange(indicatorId, [...evidence, ...newFiles], docIndex, undefined, contentId);
    };

    const handleEvidenceRemove = (itemToRemove: FileWithStatus) => {
        onEvidenceChange(indicatorId, [], docIndex, itemToRemove, contentId);
    };

    const handleAddLink = () => {
        if (!linkInput.trim() || !linkInput.startsWith('http')) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập một đường dẫn hợp lệ (bắt đầu bằng http hoặc https).' });
            return;
        }
        const newLink = { name: linkInput.trim(), url: linkInput.trim() };
        onEvidenceChange(indicatorId, [...evidence, newLink], docIndex, undefined, contentId);
        setLinkInput('');
    };

    const isLink = (item: any): item is { name: string, url: string } => {
        return typeof item.url === 'string' && (item.url.startsWith('http://') || item.url.startsWith('https://'));
    }

    const acceptedFileText = accept === '.pdf'
        ? "Chỉ chấp nhận tệp PDF."
        : "Các tệp được chấp nhận: Ảnh, Video, Word, Excel, PDF.";

    return (
        <div className="grid gap-4">

            <div className={cn("w-full relative border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors", isRequired && "border-destructive")}>
                <FileUp className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">
                    Kéo thả hoặc <span className="font-semibold text-primary">nhấn để chọn tệp</span>
                </p>
                <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple onChange={handleFileSelect} accept={accept} />
            </div>
             <p className="text-xs text-muted-foreground mt-1">{acceptedFileText} Dung lượng tối đa: 5MB.</p>

            <div className="grid gap-1">
                 <Label htmlFor={`link-${indicatorId}-${docIndex}-${contentId}`} className="text-xs">Hoặc thêm liên kết</Label>
                 <div className="flex gap-2">
                    <Input
                        id={`link-${indicatorId}-${docIndex}-${contentId}`}
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="Dán đường dẫn vào đây"
                        className="h-9 text-xs"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddLink}>Thêm</Button>
                 </div>
            </div>

             {isRequired && (
                <p className="text-sm font-medium text-destructive">
                    Yêu cầu ít nhất một minh chứng.
                </p>
            )}

            {evidence.length > 0 && (
                 <div className="space-y-2 mt-2">
                    {evidence.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-1.5 pl-2 bg-muted rounded-md text-sm">
                            <div className="flex items-center gap-2 w-0 flex-1 min-w-0">
                                {isLink(item) ? <LinkIcon className="h-4 w-4 flex-shrink-0 text-blue-500" /> : <FileIcon className="h-4 w-4 flex-shrink-0" />}
                                <span className="truncate text-xs flex-1">{item.name}</span>
                            </div>
                             <div className="flex items-center gap-1 flex-shrink-0">
                                { 'url' in item && item.url && (
                                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onPreview(item as { name: string, url: string })}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEvidenceRemove(item)}>
                                    <X className="h-4 w-4" />
                                </Button>
                             </div>
                        </div>
                    ))}
                 </div>
            )}
        </div>
    );
}

const getSpecialLogicIndicatorIds = (criteria: Criterion[]): string[] => {
    if (!criteria || criteria.length < 3) return [];

    const secondCriterion = criteria[1];
    let specialIdsFromSecondCriterion: string[] = [];
    if (secondCriterion.indicators?.length >= 2) specialIdsFromSecondCriterion.push(secondCriterion.indicators[1].id);
    if (secondCriterion.indicators?.length >= 3) specialIdsFromSecondCriterion.push(secondCriterion.indicators[2].id);
    if (secondCriterion.indicators?.length > 3 && secondCriterion.indicators[3].contents?.length > 2) specialIdsFromSecondCriterion.push(secondCriterion.indicators[3].contents[2].id);
    
    const thirdCriterion = criteria[2];
    let specialIdsFromThirdCriterion: string[] = [];
    if (thirdCriterion.indicators?.length > 0 && thirdCriterion.indicators[0].contents?.length > 0) specialIdsFromThirdCriterion.push(thirdCriterion.indicators[0].contents[0].id);
    if (thirdCriterion.indicators?.length > 0 && thirdCriterion.indicators[0].contents?.length > 1) specialIdsFromThirdCriterion.push(thirdCriterion.indicators[0].contents[1].id);
    if (thirdCriterion.indicators?.length > 1 && thirdCriterion.indicators[1].contents?.length > 0) specialIdsFromThirdCriterion.push(thirdCriterion.indicators[1].contents[0].id);

    return [...specialIdsFromSecondCriterion, ...specialIdsFromThirdCriterion];
}

const getSpecialIndicatorLabels = (indicatorId: string, criteria: Criterion[]) => {
    if (!criteria || criteria.length < 3) return { no: 'Không được giao nhiệm vụ', yes: 'Được giao nhiệm vụ' };

    const indicator3_tc2_id = criteria[1].indicators?.length >= 3 ? criteria[1].indicators[2].id : null;
    const indicator4Criterion2Contents = criteria[1].indicators?.length > 3 ? criteria[1].indicators[3].contents : [];
    const subIndicator3_tc2_i4_id = indicator4Criterion2Contents && indicator4Criterion2Contents.length > 2 ? indicator4Criterion2Contents[2].id : null;

    const criterion3Indicator1Contents = criteria[2].indicators?.length > 0 ? criteria[2].indicators[0].contents : [];
    const subIndicator1_tc3_i1_id = criterion3Indicator1Contents && criterion3Indicator1Contents.length > 0 ? criterion3Indicator1Contents[0].id : null;
    const subIndicator2_tc3_i1_id = criterion3Indicator1Contents && criterion3Indicator1Contents.length > 1 ? criterion3Indicator1Contents[1].id : null;

    const criterion3Indicator2Contents = criteria[2].indicators?.length > 1 ? criteria[2].indicators[1].contents : [];
    const subIndicator1_tc3_i2_id = criterion3Indicator2Contents && criterion3Indicator2Contents.length > 0 ? criterion3Indicator2Contents[0].id : null;
    
    if (indicatorId === indicator3_tc2_id) return { no: "Không yêu cầu cung cấp", yes: "Có yêu cầu cung cấp" };
    if (indicatorId === subIndicator3_tc2_i4_id) return { no: "Không phát sinh nhiệm vụ ngoài kế hoạch", yes: "Có phát sinh nhiệm vụ ngoài kế hoạch" };
    if (indicatorId === subIndicator1_tc3_i1_id) return { no: "Không phát sinh yêu cầu thành lập", yes: "Có phát sinh yêu cầu kiện toàn, công nhận, cho thôi hòa giải viên" };
    if (indicatorId === subIndicator2_tc3_i1_id) return { no: "Không phát sinh yêu cầu kiện toàn, công nhận, cho thôi hòa giải viên", yes: "Có phát sinh yêu cầu kiện toàn, công nhận, cho thôi hòa giải viên" };
    if (indicatorId === subIndicator1_tc3_i2_id) return { no: "Không phát sinh vụ, việc hòa giải", yes: "Có phát sinh vụ, việc hòa giải" };

    return { no: 'Không được giao nhiệm vụ', yes: 'Được giao nhiệm vụ' };
}

const getCustomBooleanLabels = (indicatorId: string, criteria: Criterion[]) => {
    if (!criteria || criteria.length < 2) return null;
    const criterion2 = criteria[1];
    if (criterion2.indicators?.length > 3 && criterion2.indicators[3].contents?.length > 0) {
        const subIndicator1_tc2_i4_id = criterion2.indicators[3].contents[0].id;
        if (indicatorId === subIndicator1_tc2_i4_id) {
            return { true: 'Ban hành đúng thời hạn', false: 'Ban hành không đúng thời hạn' };
        }
    }
    return null;
}

const getCheckboxOptions = (indicatorId: string, criteria: Criterion[]) => {
    if (!criteria || criteria.length < 3) return null;
    const criterion2 = criteria[1];
    const criterion3 = criteria[2];

    if (criterion2.indicators?.length > 4) {
        const targetIndicator = criterion2.indicators[4];
        if (indicatorId === targetIndicator.id || targetIndicator.contents?.some(c => c.id === indicatorId)) {
            return ["Tổ chức cuộc thi tìm hiểu pháp luật trực tuyến","Tổ chức tập huấn phổ biến kiến thức pháp luật và kỹ năng phổ biến, giáo dục pháp luật cho đội ngũ nhân lực làm công tác phổ biến, giáo dục pháp luật bằng hình thức trực tuyến","Phổ biến, giáo dục pháp luật trên Cổng Thông tin điện tử/Trang Thông tin điện tử của Hội đồng nhân dân, Uỷ ban nhân dân cấp xã và có sự kết nối với Cổng Pháp luật Quốc gia (đối với cấp xã đã có Cổng/Trang thông tin điện tử)","Sử dụng mạng xã hội và các nền tảng cộng đồng trực tuyến khác để thực hiện phổ biến, giáo dục pháp luật","Xây dựng, số hoá các tài liệu, sản phẩm truyền thông, phổ biến, giáo dục pháp luật như video clip, podcast, audio...","Xây dựng chatbox giải đáp pháp luật","Phổ biến, giáo dục pháp luật thông qua tin nhắn điện thoại","Hoạt động khác về chuyển đổi số, ứng dụng công nghệ số bảo đảm phù hợp"];
        }
    }
    if (criterion3.indicators?.length > 2) {
        const targetIndicator = criterion3.indicators[2];
        if (indicatorId === targetIndicator.id || targetIndicator.contents?.some(c => c.id === indicatorId)) {
            return ["Huy động đội ngũ luật sư, luật gia, Hội thẩm nhân dân, lực lượng Công an nhân dân, Bộ đội Biên phòng, báo cáo viên pháp luật, tuyên truyền viên pháp luật, lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở, người đã từng là Thẩm phán, Kiểm sát viên, Điều tra viên, người đã hoặc đang công tác trong lĩnh vực pháp luật tham gia làm hòa giải viên ở cơ sở.","Huy động đội ngũ nêu trên hỗ trợ pháp lý, tư vấn cho tổ hoà giải để giải quyết vụ, việc thuộc phạm vi hoà giải ở cơ sở.","Huy động đội ngũ nêu trên tham gia tập huấn, bồi dưỡng cho hoà giải viên.","Các hoạt động phối hợp, hỗ trợ hiệu quả của cá nhân, tổ chức khác trong triển khai công tác hòa giải ở cơ sở."];
        }
    }
    return null;
}


const renderInput = (
    indicator: Content,
    specialIndicatorIds: string[],
    specialLabels: { no: string; yes: string },
    customBooleanLabels: { true: string, false: string } | null,
    checkboxOptions: string[] | null,
    data: IndicatorValue,
    onValueChange: (id: string, value: any, contentId?: string) => void,
    onIsTaskedChange: (id: string, isTasked: boolean) => void,
    criteria: Criterion[],
    assessmentData: AssessmentValues,
    contentId?: string,
) => {
    const handleValueChange = (subfield: 'total' | 'provided' | null, value: string) => {
        if (subfield) {
            onValueChange(indicator.id, { ...(data.value || {}), [subfield]: value }, contentId);
        } else {
            onValueChange(indicator.id, value, contentId);
        }
    };

    const handleRadioChange = (val: string) => {
        onValueChange(indicator.id, val === 'true', contentId);
    }

    const handleCheckboxChange = (option: string, checked: boolean) => {
        const newValue = { ...((data.value as object) || {}), [option]: checked };
        onValueChange(indicator.id, newValue, contentId);
    };

    if (checkboxOptions) {
        return (
            <div className="grid gap-3">
                {checkboxOptions.map((option, index) => (
                     <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                            id={`${indicator.id}-check-${index}-${contentId}`}
                            checked={data.value?.[option] || false}
                            onCheckedChange={(checked) => handleCheckboxChange(option, !!checked)}
                        />
                        <Label htmlFor={`${indicator.id}-check-${index}-${contentId}`} className="font-normal">{option}</Label>
                    </div>
                ))}
            </div>
        )
    }

    if (specialIndicatorIds.includes(indicator.id)) {
        const criterion1 = criteria[0];
        const criterion2 = criteria[1];
        const isCt2_2 = criterion2?.indicators && criterion2.indicators[1]?.id === indicator.id;
        const isCt2_3 = criterion2?.indicators && criterion2.indicators[2]?.id === indicator.id;

        const tc1Data = assessmentData[criterion1.indicators[0].id];
        const assignedCount = criterion1?.assignedDocumentsCount || tc1Data.communeDefinedDocuments?.length || 0;

        const valueAsObject = typeof data.value === 'object' && data.value !== null ? data.value : {};

        return (
            <RadioGroup onValueChange={(val) => onIsTaskedChange(indicator.id, val === 'true')} value={data.isTasked === true ? 'true' : data.isTasked === false ? 'false' : ''} className="grid gap-2">
                 <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id={`${indicator.id}-notask`} />
                    <Label htmlFor={`${indicator.id}-notask`}>{specialLabels.no}</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id={`${indicator.id}-hastask`} />
                    <Label htmlFor={`${indicator.id}-hastask`}>{specialLabels.yes}</Label>
                </div>
                {data.isTasked === true && (
                     <>
                        {isCt2_2 ? (
                             <div className="grid gap-4 pl-6 pt-2">
                                 <div className="flex items-center gap-4">
                                     <Label htmlFor={`${indicator.id}-input`} className="shrink-0">Số Nghị quyết của Hội đồng nhân dân, Quyết định của Uỷ ban nhân dân sau khi ban hành được công khai</Label>
                                     <Input
                                         id={`${indicator.id}-input`}
                                         type="number"
                                         placeholder="Số lượng"
                                         className="w-28"
                                         value={data.value || ''}
                                         onChange={(e) => handleValueChange(null, e.target.value)}
                                     />
                                     <div className="flex-1">
                                         <div className="flex justify-between items-center mb-1">
                                             <Label htmlFor={`progress-${indicator.id}`} className="text-xs font-normal">Tiến độ đạt chuẩn (so với {assignedCount} được giao)</Label>
                                             <span className="text-xs font-semibold">{Math.round(((Number(data.value) || 0) / (assignedCount || 1)) * 100)}%</span>
                                         </div>
                                         <Progress id={`progress-${indicator.id}`} value={((Number(data.value) || 0) / (assignedCount || 1)) * 100} indicatorClassName={ (Number(data.value) || 0) >= assignedCount ? "bg-green-500" : "bg-yellow-500"} className="h-2"/>
                                     </div>
                                 </div>
                             </div>
                        ) : isCt2_3 ? (
                            <div className="grid gap-4 pl-6 pt-2">
                                <div className="flex items-center gap-4">
                                    <Label htmlFor={`${indicator.id}-total`} className="shrink-0">Số lượng yêu cầu cung cấp thông tin</Label>
                                    <Input id={`${indicator.id}-total`} type="number" placeholder="Tổng số" className="w-28" value={valueAsObject.total || ''} onChange={(e) => handleValueChange('total', e.target.value)} />
                                </div>
                                <div className="flex items-center gap-4">
                                     <Label htmlFor={`${indicator.id}-provided`} className="shrink-0">Số lượng thông tin đã cung cấp theo yêu cầu</Label>
                                    <Input id={`${indicator.id}-provided`} type="number" placeholder="Đã cung cấp" className="w-28" value={valueAsObject.provided || ''} onChange={(e) => handleValueChange('provided', e.target.value)} />
                                </div>
                                <div className="flex-1">
                                     <div className="flex justify-between items-center mb-1">
                                         <Label htmlFor={`progress-${indicator.id}`} className="text-xs font-normal">Tỷ lệ cung cấp thành công</Label>
                                         <span className="text-xs font-semibold">{Math.round(((Number(valueAsObject.provided) || 0) / (Number(valueAsObject.total) || 1)) * 100)}%</span>
                                     </div>
                                     <Progress id={`progress-${indicator.id}`} value={((Number(valueAsObject.provided) || 0) / (Number(valueAsObject.total) || 1)) * 100} indicatorClassName={ (Number(valueAsObject.provided) || 0) >= (Number(valueAsObject.total) || 0) ? "bg-green-500" : "bg-yellow-500"} className="h-2"/>
                                 </div>
                            </div>
                        ) : (
                            <div className="grid gap-2 pl-6 pt-2">
                                <Label htmlFor={`${indicator.id}-input`}>Tỷ lệ hoàn thành nhiệm vụ (%)</Label>
                                <Input id={`${indicator.id}-input`} type="number" placeholder="Nhập tỷ lệ %" value={data.value || ''} onChange={(e) => handleValueChange(null, e.target.value)} />
                            </div>
                        )}
                    </>
                )}
            </RadioGroup>
        )
    }

    switch (indicator.inputType) {
        case 'boolean': {
            const trueLabel = customBooleanLabels ? customBooleanLabels.true : 'Đạt';
            const falseLabel = customBooleanLabels ? customBooleanLabels.false : 'Không đạt';
            return (
                <RadioGroup onValueChange={handleRadioChange} value={data.value === true ? 'true' : data.value === false ? 'false' : ''} className="grid gap-2">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id={`${indicator.id}-true-${contentId}`} />
                        <Label htmlFor={`${indicator.id}-true-${contentId}`}>{trueLabel}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id={`${indicator.id}-false-${contentId}`} />
                        <Label htmlFor={`${indicator.id}-false-${contentId}`}>{falseLabel}</Label>
                    </div>
                </RadioGroup>
            );
        }
        case 'number':
            return (
                <div className="grid gap-2">
                    <Label htmlFor={`${indicator.id}-input-${contentId}`}>Tỷ lệ (%) hoặc số lượng</Label>
                    <Input id={`${indicator.id}-input-${contentId}`} type="number" placeholder="Nhập giá trị" value={data.value || ''} onChange={(e) => handleValueChange(null, e.target.value)} />
                </div>
            );
        case 'select':
             return (
                <div className="grid gap-2">
                     <div className="flex items-center space-x-2">
                        <Checkbox id={`${indicator.id}-check1-${contentId}`} />
                        <Label htmlFor={`${indicator.id}-check1-${contentId}`}>Có giao diện thân thiện</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id={`${indicator.id}-check2-${contentId}`} />
                        <Label htmlFor={`${indicator.id}-check2-${contentId}`}>Cập nhật thông tin thường xuyên</Label>
                    </div>
                </div>
            );
        case 'text':
             return (
                <div className="grid gap-2">
                    <Label htmlFor={`${indicator.id}-input-${contentId}`}>Kết quả</Label>
                    <Input id={`${indicator.id}-input-${contentId}`} type="text" placeholder="Nhập kết quả" value={data.value || ''} onChange={(e) => handleValueChange(null, e.target.value)} />
                </div>
            );
    }
}

const evaluateStatus = (value: any, standardLevel: string, files: FileWithStatus[], isTasked?: boolean | null, assignedCount?: number, filesPerDocument?: { [documentIndex: number]: FileWithStatus[] }): AssessmentStatus => {
    if (isTasked === false) {
        return 'achieved';
    }

    const hasFileEvidence = (files || []).some(f => 'url' in f && f.url);

    // Logic for Criterion 1 indicators
    if (assignedCount && assignedCount > 0) {
        const enteredValue = Number(value);
        if (isNaN(enteredValue) || value === null || value === '') return 'pending';

        const quantityMet = enteredValue >= assignedCount;

        if (filesPerDocument) {
            const allFiles = Object.values(filesPerDocument).flat();
            const uploadedCount = allFiles.filter(f => 'url' in f && f.url).length;
            const requiredFilesMet = uploadedCount >= enteredValue; 
            const allSignaturesValid = allFiles.every(f => 'signatureStatus' in f && f.signatureStatus === 'valid');
            
            if (quantityMet && requiredFilesMet && allSignaturesValid) {
                return 'achieved';
            }
        }
        return 'not-achieved';
    }

    // General logic for other indicators/contents
    if (value === undefined || value === null || value === '') {
        return 'pending';
    }
    
    if (!hasFileEvidence) {
        return 'not-achieved';
    }
    
    // Logic for checkbox groups
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (value.hasOwnProperty('total') && value.hasOwnProperty('provided')) {
            const total = Number(value.total);
            const provided = Number(value.provided);
            if (isNaN(total) || total === 0) return 'achieved'; // Không có yêu cầu thì coi như đạt
            if (isNaN(provided)) return 'pending';
            return (provided / total) >= 1 ? 'achieved' : 'not-achieved';
        }

        const checkedCount = Object.values(value).filter(v => v === true).length;
        const requiredCountMatch = standardLevel.match(/(\d+)/);
        if (requiredCountMatch) {
            const requiredCount = parseInt(requiredCountMatch[0], 10);
            return checkedCount >= requiredCount ? 'achieved' : 'not-achieved';
        }
        return 'pending';
    }

    // General logic for boolean and number/string comparison
    const standard = standardLevel.toLowerCase();

    if (typeof value === 'boolean') {
        const required = standard === 'đạt' || standard === 'true' || standard === 'ban hành đúng thời hạn';
        return value === required ? 'achieved' : 'not-achieved';
    }

    if (typeof value === 'number' || !isNaN(Number(value))) {
        const numericValue = Number(value);
        const match = standard.match(/([>=<]+)?\s*(\d+)/);
        if (match) {
            const operator = match[1] || '==';
            const standardValue = parseInt(match[2], 10);
            switch (operator) {
                case '>=': return numericValue >= standardValue ? 'achieved' : 'not-achieved';
                case '>': return numericValue > standardValue ? 'achieved' : 'not-achieved';
                case '<=': return numericValue <= standardValue ? 'achieved' : 'not-achieved';
                case '<': return numericValue < standardValue ? 'achieved' : 'not-achieved';
                case '==': return numericValue === standardValue ? 'achieved' : 'not-achieved';
                default: return 'pending';
            }
        }
    }

    if (typeof value === 'string') {
        return value.toLowerCase().trim() === standard.trim() ? 'achieved' : 'not-achieved';
    }

    return 'pending';
}

const StatusBadge = ({ status, isCriterion = false }: { status: AssessmentStatus, isCriterion?: boolean }) => {
    const badgeClasses = "text-sm px-3 py-1";
    let text = "";
    let style = "";

    switch (status) {
        case 'achieved':
            text = isCriterion ? 'Tiêu chí Đạt' : 'Đạt';
            style = "bg-green-600 hover:bg-green-700 text-white";
            break;
        case 'not-achieved':
            text = isCriterion ? 'Tiêu chí Không Đạt' : 'Không đạt';
            style = "bg-red-500 text-white border-red-600";
            break;
        case 'pending':
        default:
            text = isCriterion ? 'Chưa hoàn thành' : 'Chưa chấm';
            style = "border-amber-500 bg-amber-50 text-amber-800";
            break;
    }

    return isCriterion ? (
        <Badge variant={status === 'not-achieved' ? 'destructive' : 'default'} className={cn(badgeClasses, style)}>{text}</Badge>
    ) : (
        <Badge variant={status === 'not-achieved' ? 'destructive' : 'default'} className={cn(badgeClasses, style)}>{text}</Badge>
    );
};


const IndicatorAssessment = ({ specialIndicatorIds, specialLabels, customBooleanLabels, checkboxOptions, indicator, data, onValueChange, onNoteChange, onEvidenceChange, onIsTaskedChange, onPreview, criteria, assessmentData, contentId }: {
    specialIndicatorIds: string[],
    specialLabels: { no: string; yes: string },
    customBooleanLabels: { true: string, false: string} | null,
    checkboxOptions: string[] | null,
    indicator: Content,
    data: AssessmentValues[string],
    onValueChange: (id: string, value: any, contentId?: string) => void,
    onNoteChange: (id: string, note: string, contentId?: string) => void,
    onEvidenceChange: (id: string, files: (File | { name: string; url: string; })[], docIndex?: number, fileToRemove?: FileWithStatus, contentId?: string) => void,
    onIsTaskedChange: (id: string, isTasked: boolean) => void,
    onPreview: (file: {name: string, url: string}) => void,
    criteria: Criterion[],
    assessmentData: AssessmentValues,
    contentId?: string,
}) => {
    const isEvidenceRequired = data.status !== 'pending' && data.isTasked !== false && (data.files || []).length === 0;

    return (
        <div className="grid gap-6">
            <div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={data.status} />
                    <h4 className="font-semibold text-base flex-1">{indicator.name}</h4>
                </div>
                 <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md mt-3">
                    <div className="flex items-start gap-2 text-blue-800">
                        <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                        <div>
                            <p className="text-sm">{indicator.description}</p>
                            <p className="text-sm mt-2"><strong>Yêu cầu đạt chuẩn: </strong><span className="font-semibold">{indicator.standardLevel}</span></p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Kết quả tự đánh giá</Label>
                  {renderInput(indicator, specialIndicatorIds, specialLabels, customBooleanLabels, checkboxOptions, data, onValueChange, onIsTaskedChange, criteria, assessmentData, contentId)}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor={`note-${indicator.id}-${contentId}`}>Ghi chú/Giải trình</Label>
                    <Textarea
                        id={`note-${indicator.id}-${contentId}`}
                        placeholder="Giải trình thêm về kết quả hoặc các vấn đề liên quan..."
                        value={data.note}
                        onChange={(e) => onNoteChange(indicator.id, e.target.value, contentId)}
                    />
                </div>
            </div>

            <div className="grid gap-2">
                <Label className="font-medium">Hồ sơ minh chứng</Label>
                <p className="text-sm text-muted-foreground">{indicator.evidenceRequirement || 'Không yêu cầu cụ thể.'}</p>
                <div className="mt-2">
                    <EvidenceUploaderComponent indicatorId={indicator.id} contentId={contentId} evidence={data.files} onEvidenceChange={onEvidenceChange} onPreview={onPreview} isRequired={isEvidenceRequired} />
                </div>
            </div>
        </div>
    )
};

const sanitizeDataForFirestore = (data: AssessmentValues): Record<string, IndicatorResult> => {
    const sanitizedData: Record<string, IndicatorResult> = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const indicatorData = data[key];
            const sanitizeFiles = (files: FileWithStatus[]) => (files || []).map(f => {
                if (f instanceof File) {
                    return { name: f.name, url: '' };
                }
                return {
                    name: f.name,
                    url: f.url,
                    signatureStatus: f.signatureStatus,
                    signatureError: f.signatureError,
                    contentCheckStatus: f.contentCheckStatus,
                    contentCheckIssues: f.contentCheckIssues
                };
            });

            sanitizedData[key] = {
                isTasked: indicatorData.isTasked === undefined ? null : indicatorData.isTasked,
                value: indicatorData.value === undefined ? null : indicatorData.value,
                note: indicatorData.note || '',
                status: indicatorData.status,
                adminNote: indicatorData.adminNote || '',
                communeNote: indicatorData.communeNote || '',
                files: sanitizeFiles(indicatorData.files || []),
                filesPerDocument: indicatorData.filesPerDocument ? Object.fromEntries(
                    Object.entries(indicatorData.filesPerDocument).map(([idx, fileList]) => [idx, sanitizeFiles(fileList || [])])
                ) : {},
                 communeDefinedDocuments: indicatorData.communeDefinedDocuments || null,
                 contentResults: indicatorData.contentResults ? Object.fromEntries(
                    Object.entries(indicatorData.contentResults).map(([contentId, contentData]) => [contentId, {
                        ...contentData,
                        files: sanitizeFiles(contentData.files)
                    }])
                 ) : {},
                 meta: indicatorData.meta || {}
            };
        }
    }
    return sanitizedData;
};

export default function SelfAssessmentPage() {
  const router = useRouter();
  const { storage, currentUser, assessmentPeriods, criteria, assessments, updateAssessments, updateSingleAssessment, deleteFileByUrl } = useData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewFile, setPreviewFile] = useState<{name: string, url: string} | null>(null);

  const unsavedFilesRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      if (unsavedFilesRef.current.length > 0) {
        const filesToDelete = [...unsavedFilesRef.current];
        filesToDelete.forEach(async (fileUrl) => {
          try {
            await deleteFileByUrl(fileUrl);
          } catch (error) {
            console.error(`Lỗi khi dọn dẹp tệp mồ côi ${fileUrl}:`, error);
          }
        });
        unsavedFilesRef.current = [];
      }
    };
  }, [deleteFileByUrl]);

  const initializeState = useCallback((criteria: Criterion[], existingData?: Record<string, IndicatorResult>): AssessmentValues => {
      const initialState: AssessmentValues = {};
      criteria.forEach(criterion => {
          (criterion.indicators || []).forEach(indicator => {
              const savedIndicator = existingData?.[indicator.id];
              const hasNewContents = indicator.contents && indicator.contents.length > 0;

              const contentResults: AssessmentValues[string]['contentResults'] = {};
              if (hasNewContents) {
                  indicator.contents!.forEach(content => {
                      const savedContent = savedIndicator?.contentResults?.[content.id];
                      contentResults[content.id] = {
                          value: savedContent?.value ?? '',
                          files: savedContent?.files ?? [],
                          status: savedContent?.status ?? 'pending',
                          note: savedContent?.note ?? '',
                      };
                  });
              }

              initialState[indicator.id] = {
                isTasked: savedIndicator?.isTasked ?? null,
                value: savedIndicator?.value ?? '',
                files: savedIndicator?.files ?? [],
                filesPerDocument: savedIndicator?.filesPerDocument ?? {},
                note: savedIndicator?.note ?? '',
                status: savedIndicator?.status ?? 'pending',
                adminNote: savedIndicator?.adminNote ?? '',
                communeNote: savedIndicator?.communeNote ?? '',
                communeDefinedDocuments: savedIndicator?.communeDefinedDocuments ?? [],
                contentResults: contentResults,
                meta: savedIndicator?.meta || {}
            };
          });
      });

      return initialState;
  }, []);

  const activePeriod = assessmentPeriods.find(p => p.isActive);
  const myAssessment = activePeriod && currentUser
      ? assessments.find(a => a.assessmentPeriodId === activePeriod.id && a.communeId === currentUser.communeId)
      : undefined;

  const [assessmentData, setAssessmentData] = useState<AssessmentValues>(() => initializeState(criteria, myAssessment?.assessmentData));

  useEffect(() => {
    if (myAssessment?.assessmentData) {
        const newState = initializeState(criteria, myAssessment.assessmentData);
        setAssessmentData(newState);
    }
  }, [myAssessment, criteria, initializeState]);

  const specialLogicIndicatorIds = React.useMemo(() => getSpecialLogicIndicatorIds(criteria), [criteria]);

  const findIndicator = useCallback((indicatorId: string): Indicator | Content | null => {
      for (const criterion of criteria) {
          for (const indicator of (criterion.indicators || [])) {
              if (indicator.id === indicatorId) return indicator;
              
              if (indicator.contents) {
                  const matchedContent = indicator.contents.find(content => content.id === indicatorId);
                  if (matchedContent) return matchedContent;
              }
          }
      }
      return null;
  }, [criteria]);

    const evaluateIndicatorByPassRule = (indicator: Indicator, contentResults: AssessmentValues[string]['contentResults']): AssessmentStatus => {
        if (!indicator.contents || indicator.contents.length === 0 || !contentResults) {
            return 'pending';
        }

        const passRule = indicator.passRule || { type: 'all' };
        const totalContents = indicator.contents.length;
        let metCount = 0;
        let hasPending = false;

        for (const content of indicator.contents) {
            const result = contentResults[content.id];
            if (!result || result.status === 'pending') {
                hasPending = true;
            } else if (result.status === 'achieved') {
                metCount++;
            }
        }
        
        if (hasPending) return 'pending';

        switch (passRule.type) {
            case 'all':
                return metCount === totalContents ? 'achieved' : 'not-achieved';
            case 'atLeast':
                return metCount >= (passRule.minCount || 1) ? 'achieved' : 'not-achieved';
            case 'percentage':
                 const percentage = (metCount / totalContents) * 100;
                return percentage >= (passRule.minPercent || 100) ? 'achieved' : 'not-achieved';
            default:
                return 'pending';
        }
    };


const handleIsTaskedChange = useCallback((id: string, isTasked: boolean) => {
    // 'id' có thể là indicator.id (đơn giản) hoặc content.id (phức tạp)
    setAssessmentData(prev => {
        const item = findIndicator(id); // item là Indicator hoặc Content
        if (!item) return prev;

        const newData = { ...prev };
        
        // Kiểm tra xem đây là Content hay Indicator
        const parentIndicator = criteria.flatMap(c => c.indicators).find(i => i.contents?.some(c => c.id === id));

        if (parentIndicator) { 
            // ============ ĐÂY LÀ LOGIC SỬA CHO CONTENT ITEM ============
            const contentId = id;
            
            // 1. Lấy dữ liệu của CHỈ TIÊU CHA
            const parentData = { ...newData[parentIndicator.id] }; 
            const contentResults = { ...(parentData.contentResults || {}) };
            
            // 2. Đảm bảo nội dung con này tồn tại trong state
            if (contentResults[contentId]) {
                const currentContentData = contentResults[contentId];
                const valueToEvaluate = isTasked ? currentContentData.value : null;
                // 'item' ở đây chính là object 'content'
                const newStatus = evaluateStatus(valueToEvaluate, item.standardLevel, isTasked ? currentContentData.files : [], isTasked);
                
                // 3. Cập nhật nội dung con (thêm/cập nhật trường isTasked)
                contentResults[contentId] = {
                    ...currentContentData,
                    isTasked: isTasked, 
                    status: newStatus,
                    value: isTasked ? currentContentData.value : null,
                    files: isTasked ? currentContentData.files : [],
                };

                // 4. Tính toán lại trạng thái cha
                const newParentStatus = evaluateIndicatorByPassRule(parentIndicator, contentResults);
                
                // 5. Cập nhật state của cha
                newData[parentIndicator.id] = {
                    ...parentData,
                    contentResults: contentResults,
                    status: newParentStatus,
                };
            }
        } else { 
            // ============ LOGIC CHO INDICATOR ĐƠN GIẢN (KHÔNG THAY ĐỔI) ============
            const indicatorId = id;
            const indicatorData = { ...newData[indicatorId] }; 
            const valueToEvaluate = isTasked ? indicatorData.value : null;
            const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === indicatorId));
            
            let assignedCount;
            if (parentCriterion?.id === 'TC01') {
                const tc1Data = prev[parentCriterion.indicators[0].id];
                assignedCount = parentCriterion.assignedDocumentsCount || tc1Data.communeDefinedDocuments?.length || 0;
            } else if (criteria[1]?.indicators?.[1]?.id === indicatorId) {
                 const tc1Data = prev[criteria[0].indicators[0].id];
                 assignedCount = criteria[0]?.assignedDocumentsCount || tc1Data.communeDefinedDocuments?.length || 0;
            }
            
            const files = isTasked ? indicatorData.files : [];
            const filesPerDocument = parentCriterion?.id === 'TC01' ? indicatorData.filesPerDocument : undefined;
            const newStatus = evaluateStatus(valueToEvaluate, item.standardLevel, files, isTasked, assignedCount, filesPerDocument);

            newData[indicatorId] = {
                ...indicatorData,
                isTasked: isTasked,
                status: newStatus,
                value: isTasked ? indicatorData.value : null,
                files: isTasked ? indicatorData.files : [],
                filesPerDocument: isTasked ? indicatorData.filesPerDocument : {},
            };
        }
        return newData;
    });
}, [criteria, findIndicator]);

const handleValueChange = useCallback((indicatorId: string, value: any, contentId?: string) => {
    setAssessmentData(prev => {
        const indicator = findIndicator(indicatorId) as Indicator | null;
        if (!indicator) return prev;

        const newData = { ...prev };
        
        if (contentId) { // Updating a content item within an indicator
            const content = indicator.contents?.find(c => c.id === contentId);
            if (!content) return prev;

            const contentResults = { ...(newData[indicatorId].contentResults || {}) };
            const currentContentData = contentResults[contentId] || { files: [], status: 'pending', value: null };
            
            const newContentStatus = evaluateStatus(value, content.standardLevel, currentContentData.files, true);

            contentResults[contentId] = {
                ...currentContentData,
                value: value,
                status: newContentStatus,
            };

            const newIndicatorStatus = evaluateIndicatorByPassRule(indicator, contentResults);
            
            newData[indicatorId] = {
                ...newData[indicatorId],
                contentResults: contentResults,
                status: newIndicatorStatus
            };

        } else { // Updating a simple indicator
            const isTasked = prev[indicatorId].isTasked;
            const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === indicatorId));

            let assignedCount;
            if (parentCriterion?.id === 'TC01') {
                const tc1Data = prev[parentCriterion.indicators[0].id];
                assignedCount = parentCriterion.assignedDocumentsCount || tc1Data.communeDefinedDocuments?.length || 0;
            } else if (criteria[1]?.indicators?.[1]?.id === indicatorId) {
                 const tc1Data = prev[criteria[0].indicators[0].id];
                 assignedCount = criteria[0]?.assignedDocumentsCount || tc1Data.communeDefinedDocuments?.length || 0;
            }

            const filesPerDocument = parentCriterion?.id === 'TC01' ? prev[indicatorId].filesPerDocument : undefined;
            const newStatus = evaluateStatus(value, indicator.standardLevel, prev[indicatorId].files, isTasked, assignedCount, filesPerDocument);

            newData[indicatorId] = {
                ...newData[indicatorId],
                value: value,
                status: newStatus
            };
        }

        return newData;
    });
}, [criteria, findIndicator]);

const handleCommuneDocsChange = useCallback((indicatorId: string, docs: any[]) => {
    setAssessmentData(prev => ({
        ...prev,
        [indicatorId]: {
            ...prev[indicatorId],
            communeDefinedDocuments: docs,
        }
    }));
}, []);

const handleNoteChange = useCallback((indicatorId: string, note: string, contentId?: string) => {
    setAssessmentData(prev => {
        const newData = { ...prev };
        if (contentId) {
             const contentResults = { ...(newData[indicatorId].contentResults || {}) };
             if(contentResults[contentId]) {
                 contentResults[contentId].note = note;
                 newData[indicatorId] = { ...newData[indicatorId], contentResults };
             }
        } else {
            newData[indicatorId] = {
                ...newData[indicatorId],
                note: note,
            };
        }
        return newData;
    });
}, []);

const handleEvidenceChange = useCallback((indicatorId: string, newFiles: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus, contentId?: string) => {
    setAssessmentData(prev => {
        const newData = { ...prev };
        const indicator = findIndicator(indicatorId) as Indicator | null;
        if (!indicator) return prev;

        const indicatorData = { ...newData[indicatorId] };
        
        let fileList: FileWithStatus[];
        let currentValue: any;

        if (contentId) {
            const contentResults = { ...(indicatorData.contentResults || {}) };
            const contentData = { ...(contentResults[contentId] || { files: [], status: 'pending', value: null }) };
            fileList = [...(contentData.files || [])];
            currentValue = contentData.value;
        } else if (docIndex !== undefined) {
             const filesPerDoc = { ...(indicatorData.filesPerDocument || {}) };
             fileList = [...(filesPerDoc[docIndex] || [])];
             currentValue = indicatorData.value;
        } else {
            fileList = [...(indicatorData.files || [])];
            currentValue = indicatorData.value;
        }

        if (fileToRemove) {
            fileList = fileList.filter(f => f.name !== fileToRemove.name);
        } else {
            fileList.push(...newFiles);
        }

        if (contentId) {
             const content = indicator.contents?.find(c => c.id === contentId);
             if (!content) return prev;
             const contentResults = { ...(indicatorData.contentResults || {}) };
             const newContentStatus = evaluateStatus(currentValue, content.standardLevel, fileList, true);
             contentResults[contentId] = { ...(contentResults[contentId] || { value: null }), files: fileList, status: newContentStatus };
             indicatorData.contentResults = contentResults;
             indicatorData.status = evaluateIndicatorByPassRule(indicator, contentResults);
        } else if (docIndex !== undefined) {
            const filesPerDoc = { ...(indicatorData.filesPerDocument || {}) };
            filesPerDoc[docIndex] = fileList;
            indicatorData.filesPerDocument = filesPerDoc;
             const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === indicatorId));
             let assignedCount;
             if (parentCriterion?.id === 'TC01') {
                 const tc1Data = prev[parentCriterion.indicators[0].id];
                 assignedCount = parentCriterion.assignedDocumentsCount || tc1Data.communeDefinedDocuments?.length || 0;
             }
            indicatorData.status = evaluateStatus(currentValue, indicator.standardLevel, [], indicatorData.isTasked, assignedCount, filesPerDoc);
        } else {
            indicatorData.files = fileList;
            indicatorData.status = evaluateStatus(currentValue, indicator.standardLevel, fileList, indicatorData.isTasked);
        }

        newData[indicatorId] = indicatorData;
        return newData;
    });
}, [criteria, findIndicator]);


const handleSaveDraft = useCallback(async () => {
    if (!activePeriod || !currentUser || !storage) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy kỳ đánh giá hoặc người dùng.' });
        return;
    }

    setIsSubmitting(true);
    const savingToast = toast({ title: 'Đang lưu nháp...' });

    try {
        const dataToSave = JSON.parse(JSON.stringify(assessmentData));
        const uploadPromises: Promise<void>[] = [];

        for (const indicatorId in assessmentData) {
            const indicatorState = assessmentData[indicatorId];

            const processFileList = (files: any[], docIndex?: number, contentId?: string) => {
                files.forEach((file, fileIndex) => {
                    if (file instanceof File) {
                        const promise = async () => {
                            try {
                                 const filePath = contentId
                                    ? `hoso/${currentUser.communeId}/evidence/${activePeriod.id}/${indicatorId}/${contentId}/${file.name}`
                                    : docIndex !== undefined
                                        ? `hoso/${currentUser.communeId}/evidence/${activePeriod.id}/${indicatorId}/${docIndex}/${file.name}`
                                        : `hoso/${currentUser.communeId}/evidence/${activePeriod.id}/${indicatorId}/${file.name}`;
                                
                                const storageRef = ref(storage, filePath);
                                const snapshot = await uploadBytes(storageRef, file);
                                const downloadURL = await getDownloadURL(snapshot.ref);

                                if (contentId) {
                                    dataToSave[indicatorId].contentResults[contentId].files[fileIndex] = { name: file.name, url: downloadURL };
                                } else if (docIndex !== undefined) {
                                    dataToSave[indicatorId].filesPerDocument[docIndex][fileIndex] = { name: file.name, url: downloadURL };
                                } else {
                                    dataToSave[indicatorId].files[fileIndex] = { name: file.name, url: downloadURL };
                                }
                            } catch (uploadError) {
                                console.error(`Lỗi khi tải lên file ${file.name}:`, uploadError);
                                throw new Error(`Failed to upload ${file.name}`);
                            }
                        };
                        uploadPromises.push(promise());
                    }
                });
            };
            
            if (indicatorState.filesPerDocument) {
                for (const docIndex in indicatorState.filesPerDocument) {
                    processFileList(indicatorState.filesPerDocument[docIndex], Number(docIndex));
                }
            }
            
            if (indicatorState.contentResults) {
                for (const contentId in indicatorState.contentResults) {
                     processFileList(indicatorState.contentResults[contentId].files, undefined, contentId);
                }
            }

            if (indicatorState.files && !indicatorState.contentResults && Object.keys(indicatorState.filesPerDocument || {}).length === 0) {
                processFileList(indicatorState.files);
            }

        }

        await Promise.all(uploadPromises);

        const currentAssessment = assessments.find(a => a.assessmentPeriodId === activePeriod.id && a.communeId === currentUser.communeId);
        if (!currentAssessment) throw new Error("Không tìm thấy hồ sơ đăng ký hợp lệ.");

        const updatedAssessment: Assessment = {
            ...currentAssessment,
            assessmentStatus: 'draft',
            assessmentData: sanitizeDataForFirestore(dataToSave),
        };

        await updateSingleAssessment(updatedAssessment);

        savingToast.dismiss();
        toast({
          title: "Lưu nháp thành công!",
          description: "Bạn có thể tiếp tục chỉnh sửa sau.",
        });

    } catch (error) {
        console.error("Lỗi khi lưu nháp:", error);
        savingToast.dismiss();
        toast({ 
            variant: 'destructive', 
            title: 'Lỗi khi lưu nháp', 
            description: 'Đã xảy ra lỗi khi tải tệp hoặc lưu dữ liệu.' 
        });
    } finally {
        setIsSubmitting(false);
    }
}, [activePeriod, currentUser, storage, assessmentData, assessments, updateSingleAssessment, toast]);

  useEffect(() => {
    const hasUnsavedFiles = Object.values(assessmentData).some(indicator =>
        (indicator.files || []).some(f => f instanceof File) ||
        (indicator.filesPerDocument && Object.values(indicator.filesPerDocument).some(list => list.some(f => f instanceof File))) ||
        (indicator.contentResults && Object.values(indicator.contentResults).some(res => (res.files || []).some(f => f instanceof File)))
    );

    if (hasUnsavedFiles) {
        const handler = setTimeout(() => {
            handleSaveDraft();
        }, 5000); // 5-second debounce

        return () => clearTimeout(handler);
    }
  }, [assessmentData, handleSaveDraft]);

  const { canSubmit, submissionErrors } = useMemo(() => {
    const errors: string[] = [];
    let allItemsAssessed = true;

    for (const id in assessmentData) {
        const data = assessmentData[id];
        const indicator = findIndicator(id) as Indicator;
        if (!indicator) continue;
        
        const checkEvidence = (itemData: any, itemName: string, isCriterion1: boolean) => {
            if (itemData.status !== 'pending' && itemData.isTasked !== false) {
                 if (isCriterion1) {
                    const assignedDocsCount = (criteria.find(c=>c.id === 'TC01') as Criterion).assignedDocumentsCount || itemData.communeDefinedDocuments?.length || 0;
                    if (assignedDocsCount > 0 && Number(itemData.value) > 0) {
                        const docIndicesWithMissingFiles = Array.from({length: Number(itemData.value)}, (_, i) => i)
                           .filter(i => (itemData.filesPerDocument?.[i] || []).filter((f: any) => 'url' in f && f.url).length === 0);
                        if (docIndicesWithMissingFiles.length > 0) {
                            errors.push(`Chỉ tiêu "${itemName}" yêu cầu minh chứng cho mỗi văn bản đã ban hành.`);
                        }
                    }
                 } else if ((itemData.files || []).filter((f: any) => 'url' in f && f.url).length === 0) {
                    errors.push(`Mục "${itemName}" yêu cầu minh chứng.`);
                 }
            }
        };
        
        if (indicator.contents && indicator.contents.length > 0) {
            if (data.status === 'pending') allItemsAssessed = false;
            
            for(const content of indicator.contents) {
                const contentResult = data.contentResults?.[content.id];
                if (!contentResult || contentResult.status === 'pending') {
                    allItemsAssessed = false;
                }
                checkEvidence(contentResult || { status: 'pending'}, content.name, false);
            }
        } else {
            if (data.status === 'pending') allItemsAssessed = false;
            const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === id));
            const isCriterion1 = parentCriterion?.id === 'TC01';
            checkEvidence(data, indicator.name, isCriterion1);
        }
    }

    if (!allItemsAssessed) {
        errors.push("Bạn phải hoàn thành việc chấm điểm cho tất cả các chỉ tiêu/nội dung.");
    }

    return { canSubmit: errors.length === 0, submissionErrors: [...new Set(errors)] };
}, [assessmentData, findIndicator, criteria]);

  const handleSubmit = async () => {
    if (!activePeriod || !currentUser || !storage) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy kỳ đánh giá, người dùng hoặc dịch vụ lưu trữ.' });
        return;
    }

    setIsSubmitting(true);
    toast({ title: 'Đang gửi hồ sơ...', description: 'Vui lòng chờ trong giây lát.' });

    try {
        await handleSaveDraft();
        const myAssessmentAfterDraft = assessments.find(a => a.assessmentPeriodId === activePeriod.id && a.communeId === currentUser.communeId);

        if (!myAssessmentAfterDraft) {
             toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy hồ sơ đăng ký hợp lệ.' });
             setIsSubmitting(false);
             return;
        }

        const updatedAssessment: Assessment = {
            ...myAssessmentAfterDraft,
            assessmentStatus: 'pending_review',
            assessmentSubmissionDate: new Date().toLocaleDateString('vi-VN'),
            submittedBy: currentUser.id,
        };

        await updateSingleAssessment(updatedAssessment);
        unsavedFilesRef.current = [];

        toast({
            title: "Gửi đánh giá thành công!",
            description: "Hồ sơ của bạn đã được gửi đến Admin để xem xét.",
        });

        router.push('/dashboard');

    } catch (error) {
        console.error("Submission error:", error);
        toast({ variant: 'destructive', title: 'Lỗi khi gửi', description: 'Đã xảy ra lỗi khi tải tệp hoặc lưu dữ liệu.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const calculateCriterionStatus = (criterion: Criterion): AssessmentStatus => {
    if (!assessmentData || Object.keys(assessmentData).length === 0 || !criterion.indicators || criterion.indicators.length === 0) {
        return 'pending';
    }

    if (criterion.id === 'TC01') {
        const firstIndicatorId = criterion.indicators[0]?.id;
        if (firstIndicatorId && assessmentData[firstIndicatorId]?.isTasked === false) {
            return 'achieved';
        }
    }

    let hasPending = false;

    for (const indicator of criterion.indicators) {
        if (!assessmentData[indicator.id] || !assessmentData[indicator.id].status) {
            return 'pending';
        }
        
        const status = assessmentData[indicator.id].status;
        
        if (status === 'not-achieved') {
            return 'not-achieved';
        }

        if (status === 'pending') {
            hasPending = true;
        }
    }

    if (hasPending) {
        return 'pending';
    }

    return 'achieved';
};

  const handlePreview = (file: { name: string, url: string }) => {
    setPreviewFile(file);
};

  if (criteria.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Đang tải bộ tiêu chí...</span>
        </div>
      )
  }

  return (
    <>
    <PageHeader title="Tự Chấm điểm & Đánh giá" description="Thực hiện tự đánh giá theo các tiêu chí và cung cấp hồ sơ minh chứng đi kèm."/>
    <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Thông tin kỳ đánh giá</CardTitle>
                <CardDescription>
                  {activePeriod
                    ? `Kỳ đánh giá: ${activePeriod.name}. Vui lòng hoàn thành trước ngày ${activePeriod.endDate}.`
                    : "Hiện tại không có kỳ đánh giá nào đang hoạt động."
                  }
                </CardDescription>
            </CardHeader>
            {activePeriod && currentUser ? (
                <>
                <CardContent>
                    <Accordion type="multiple" defaultValue={criteria.map(c => c.id)} className="w-full">
                        {criteria.map((criterion, index) => {
                             const criterionStatus = calculateCriterionStatus(criterion);
                             const triggerClasses = cn(
                                 "font-headline text-lg rounded-md px-4 transition-colors hover:no-underline",
                                 criterionStatus === 'achieved' && 'bg-green-100 hover:bg-green-200/80',
                                 criterionStatus === 'not-achieved' && 'bg-red-100 hover:bg-red-200/80',
                                 criterionStatus === 'pending' && 'bg-amber-100 hover:bg-amber-200/80',
                             );

                             if (index === 0) {
                                 return (
                                     <AccordionItem value={criterion.id} key={criterion.id}>
                                        <AccordionTrigger className={triggerClasses}>
                                            <div className="flex items-center gap-4 flex-1">
                                                <StatusBadge status={criterionStatus} isCriterion={true} />
                                                <span className="text-xl font-semibold">Tiêu chí {index+1}: {criterion.name.replace(`Tiêu chí ${index + 1}: `, '')}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                             <div className="space-y-8 pl-4 border-l-2 border-primary/20 ml-2 py-4">
                                                <Criterion1Assessment
                                                    criterion={criterion}
                                                    assessmentData={assessmentData}
                                                    onValueChange={handleValueChange}
                                                    onNoteChange={handleNoteChange}
                                                    onEvidenceChange={handleEvidenceChange}
                                                    onIsTaskedChange={handleIsTaskedChange}
                                                    onPreview={handlePreview}
                                                    periodId={activePeriod.id}
                                                    communeId={currentUser.communeId}
                                                    handleCommuneDocsChange={handleCommuneDocsChange}
                                                 />
                                             </div>
                                        </AccordionContent>
                                     </AccordionItem>
                                 );
                             }

                             return (
                                <AccordionItem value={criterion.id} key={criterion.id}>
                                    <AccordionTrigger className={triggerClasses}>
                                        <div className="flex items-center gap-4 flex-1">
                                                <StatusBadge status={criterionStatus} isCriterion={true} />
                                                <span className="text-xl font-semibold">Tiêu chí {index+1}: {criterion.name.replace(`Tiêu chí ${index + 1}: `, '')}</span>
                                            </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-8 pl-4 border-l-2 border-primary/20 ml-2 py-4">
                                            {(criterion.indicators || []).map(indicator => {
                                                if (!assessmentData[indicator.id]) return null;

                                                const indicatorBlockClasses = cn(
                                                    "grid gap-6 p-4 rounded-lg bg-card shadow-sm border transition-colors",
                                                    assessmentData[indicator.id]?.status === 'achieved' && 'bg-green-50 border-green-200',
                                                    assessmentData[indicator.id]?.status === 'not-achieved' && 'bg-red-50 border-red-200',
                                                    assessmentData[indicator.id]?.status === 'pending' && 'bg-amber-50 border-amber-200'
                                                );
                                                
                                                const hasContents = indicator.contents && indicator.contents.length > 0;

                                                return (
                                                    <div key={indicator.id} className={indicatorBlockClasses}>
                                                        {hasContents ? (
                                                             <>
                                                                <div className="flex items-center gap-2">
                                                                    <StatusBadge status={assessmentData[indicator.id]?.status} />
                                                                    <h4 className="font-semibold text-base flex-1">{indicator.name}</h4>
                                                                </div>
                                                                <div className="mt-4 pl-6 space-y-6 border-l-2 border-dashed">
                                                                  {(indicator.contents || []).map(content => {
                                                                        const contentData = assessmentData[indicator.id]?.contentResults?.[content.id];
                                                                        if (!contentData) return null;
                                                                        
                                                                        const subBlockClasses = cn(
                                                                            "relative pl-6 transition-colors rounded-r-lg py-4",
                                                                             contentData.status === 'achieved' && 'bg-green-50',
                                                                             contentData.status === 'not-achieved' && 'bg-red-50',
                                                                             contentData.status === 'pending' && 'bg-amber-50 border-l-amber-200'
                                                                        );
                                                                        return (
                                                                          <div key={content.id} className={subBlockClasses}>
                                                                              <CornerDownRight className="absolute -left-3 top-5 h-5 w-5 text-muted-foreground"/>
                                                                              <IndicatorAssessment
                                                                                  specialIndicatorIds={specialLogicIndicatorIds}
                                                                                  specialLabels={getSpecialIndicatorLabels(content.id, criteria)}
                                                                                  customBooleanLabels={getCustomBooleanLabels(content.id, criteria)}
                                                                                  checkboxOptions={getCheckboxOptions(content.id, criteria)}
                                                                                  indicator={content}
                                                                                  data={contentData as any}
                                                                                  onValueChange={(id, value) => handleValueChange(indicator.id, value, content.id)}
                                                                                  onNoteChange={(id, note) => handleNoteChange(indicator.id, note, content.id)}
                                                                                  onEvidenceChange={(id, files, docIdx, fileToDel, cId) => handleEvidenceChange(indicator.id, files, docIdx, fileToDel, cId)}
                                                                                  onIsTaskedChange={(id, isTasked) => handleIsTaskedChange(content.id, isTasked)}
                                                                                  onPreview={handlePreview}
                                                                                  criteria={criteria}
                                                                                  assessmentData={assessmentData}
                                                                                  contentId={content.id}
                                                                              />
                                                                          </div>
                                                                        )
                                                                  })}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <IndicatorAssessment
                                                                specialIndicatorIds={specialLogicIndicatorIds}
                                                                specialLabels={getSpecialIndicatorLabels(indicator.id, criteria)}
                                                                customBooleanLabels={getCustomBooleanLabels(indicator.id, criteria)}
                                                                checkboxOptions={getCheckboxOptions(indicator.id, criteria)}
                                                                indicator={indicator as Content}
                                                                data={assessmentData[indicator.id]}
                                                                onValueChange={handleValueChange}
                                                                onNoteChange={handleNoteChange}
                                                                onEvidenceChange={handleEvidenceChange}
                                                                onIsTaskedChange={handleIsTaskedChange}
                                                                onPreview={handlePreview}
                                                                criteria={criteria}
                                                                assessmentData={assessmentData}
                                                                contentId={indicator.id}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                             )
                        })}
                    </Accordion>
                </CardContent>
                <CardFooter className="flex flex-col items-end gap-4 border-t pt-6">
                    {!canSubmit && (
                        <Alert variant="destructive" className="w-full">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Chưa thể gửi hồ sơ</AlertTitle>
                            <AlertDescription>
                                <ul className="list-disc pl-5">
                                    {submissionErrors.map((error, index) => <li key={index}>{error}</li>)}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>Lưu nháp</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </Button>
                    </div>
                </CardFooter>
                </>
            ) : (
                 <CardContent>
                    <p>Vui lòng chờ Admin kích hoạt một đợt đánh giá mới.</p>
                </CardContent>
            )}
        </Card>
    </div>

    <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-0">
                <DialogTitle>Xem trước: {previewFile?.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 px-6 pb-6 h-full">
                {previewFile && (
                    <iframe
                        src={`https://docs.google.com/gview?url=${encodeURIComponent(previewFile.url)}&embedded=true`}
                        className="w-full h-full border rounded-md"
                        title={previewFile.name}
                    ></iframe>
                )}
            </div>
            <DialogFooter className="p-6 pt-0 border-t">
                 <Button variant="secondary" asChild>
                    <a href={previewFile?.url} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4"/> Tải xuống
                    </a>
                 </Button>
                <Button variant="outline" onClick={() => setPreviewFile(null)}>Đóng</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
