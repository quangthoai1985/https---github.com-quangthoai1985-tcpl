'use client';
import React from 'react';
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Info } from "lucide-react";
import type { Indicator } from "@/lib/data";
import Criterion1EvidenceUploader from "./Criterion1EvidenceUploader";
import EvidenceUploaderComponent from "./EvidenceUploaderComponent"; // Cho CT1.2, CT1.3
import StatusBadge from "./StatusBadge";
import type { IndicatorValue, FileWithStatus } from "./types";

const TC1IndicatorRenderer = ({
    indicator,
    indicatorIndex, // Cần index để phân biệt CT1.1 với CT1.2/1.3
    data,
    docsToRender,
    assignedCount,
    onValueChange,
    onNoteChange,
    handleUploadComplete, // Callback đã được bọc
    handleRemoveFile,     // Callback đã được bọc
    handleAddLink,        // Callback đã được bọc
    onEvidenceChange,     // Callback gốc cho CT1.2/1.3
    onPreview,
    periodId,
    communeId
}: {
    indicator: Indicator;
    indicatorIndex: number;
    data: IndicatorValue;
    docsToRender: any[];
    assignedCount: number;
    onValueChange: (id: string, value: any) => void;
    onNoteChange: (id: string, note: string) => void;
    handleUploadComplete: (docIndex: number, newFile: { name: string; url: string; }) => void;
    handleRemoveFile: (docIndex: number, fileToRemove: FileWithStatus) => void;
    handleAddLink: (docIndex: number, newLink: { name: string; url: string; }) => void;
    onEvidenceChange: (id: string, files: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus) => void;
    onPreview: (file: { name: string; url: string; }) => void;
    periodId: string;
    communeId: string;
}) => {

    const valueAsNumber = Number(data.value);
    const progress = (assignedCount > 0 || docsToRender.length > 0) && !isNaN(valueAsNumber)
        ? Math.round((valueAsNumber / (assignedCount || docsToRender.length || 1)) * 100)
        : 0;
    const progressColor = progress >= 100 ? "bg-green-500" : "bg-yellow-500";

    const blockClasses = cn(
        "p-4 rounded-lg bg-card shadow-sm border",
        data.status === 'achieved' && 'bg-green-50 border-green-200',
        data.status === 'not-achieved' && 'bg-red-50 border-red-200',
        data.status === 'pending' && 'bg-amber-50 border-amber-200'
    );

     // Mặc định deadline cho hiển thị (logic tính toán nằm ở backend)
    const defaultDeadline = 30; 

    return (
         <div className={blockClasses}>
            {/* Header */}
            <div className="flex items-center gap-2">
              <StatusBadge status={data.status} />
              {/* Sử dụng tên của chỉ tiêu con (CT1.1, CT1.2, CT1.3) */}
              <h4 className="font-semibold text-base flex-1">{indicator.name}</h4>
            </div>
            
             {/* Info Box (Sử dụng description, standardLevel của chỉ tiêu con) */}
             <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md mt-3">
                <div className="flex items-start gap-2 text-blue-800">
                    <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                    <div>
                        <p className="text-sm">{indicator.description}</p>
                        <p className="text-sm mt-2"><strong>Yêu cầu đạt chuẩn: </strong><span className="font-semibold">{indicator.standardLevel}</span></p>
                    </div>
                </div>
            </div>

            {/* Input Số lượng */}
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
                {/* Progress Bar (Chỉ hiển thị cho CT1.1 nếu cần) */}
                {indicatorIndex === 0 && (
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <Label htmlFor={`progress-${indicator.id}`} className="text-xs font-normal">Tiến độ đạt chuẩn (so với {assignedCount || docsToRender.length} được giao)</Label>
                            <span className="text-xs font-semibold">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress id={`progress-${indicator.id}`} value={progress} indicatorClassName={progressColor} className="h-2"/>
                    </div>
                )}
              </div>
            </div>

            {/* Hồ sơ minh chứng */}
            <div className="grid gap-2 mt-4">
                <Label className="font-medium">Hồ sơ minh chứng</Label>
                <p className="text-sm text-muted-foreground">{indicator.evidenceRequirement || 'Không yêu cầu cụ thể.'}</p>
                
                {/* Logic chọn Uploader */}
                {indicatorIndex === 0 ? ( 
                    // ----- Logic cho Chỉ tiêu 1.1 (index 0) -----
                    <>
                        <Alert variant="destructive" className="border-amber-500 text-amber-900 bg-amber-50 [&>svg]:text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle className="font-semibold text-amber-800">Lưu ý quan trọng</AlertTitle>
                            <AlertDescription>Các tệp PDF được tải lên sẽ được hệ thống tự động kiểm tra chữ ký số.</AlertDescription>
                        </Alert>

                        {docsToRender.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                                {docsToRender.map((doc, docIndex) => {
                                    // Lấy evidence từ data (filesPerDocument của chỉ tiêu hiện tại)
                                    const evidence = data.filesPerDocument?.[docIndex] || [];
                                    const isRequired = data.status !== 'pending' && data.isTasked !== false && evidence.length === 0 && Number(data.value || 0) > docIndex;

                                    return (
                                        <div key={docIndex} className="p-3 border rounded-lg grid gap-2 bg-background">
                                            {/* Input chi tiết khi xã tự điền */}
                                            {(indicator.assignmentType === 'quantity' && (indicator.assignedDocumentsCount || 0) === 0) && (
                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 border-b pb-4">
                                                    {/* ... Inputs for name, excerpt, issueDate, deadline ... */}
                                                 </div>
                                            )}
                                            <Label className="font-medium text-center text-sm truncate">Minh chứng cho: <span className="font-bold text-primary">{doc.name || `Văn bản ${docIndex + 1}`}</span></Label>
                                            <Criterion1EvidenceUploader 
                                                indicatorId={indicator.id} // ID của CT1.1
                                                docIndex={docIndex} 
                                                evidence={evidence} 
                                                // Dùng các hàm helper đã bọc từ cha
                                                onUploadComplete={handleUploadComplete} 
                                                onRemove={handleRemoveFile} 
                                                onAddLink={handleAddLink}
                                                onPreview={onPreview} 
                                                periodId={periodId} 
                                                communeId={communeId} 
                                                accept=".pdf"
                                            />
                                            {isRequired && ( /* ... */ )}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (indicator.assignmentType === 'quantity' && (indicator.assignedDocumentsCount || 0) === 0 && Number(data.value || 0) === 0) ?
                            <p className="text-sm text-muted-foreground">Vui lòng nhập số lượng VBQPPL đã ban hành ở trên để kê khai chi tiết.</p>
                            : <p className="text-sm text-muted-foreground">Admin chưa cấu hình văn bản cụ thể.</p>}
                    </>
                ) : (
                    // ----- Logic cho Chỉ tiêu 1.2 và 1.3 (index > 0) -----
                    <EvidenceUploaderComponent 
                        indicatorId={indicator.id} // ID của CT1.2 hoặc CT1.3
                        evidence={data.files || []} // Dùng mảng files thông thường
                        onEvidenceChange={onEvidenceChange} // Dùng callback gốc
                        onPreview={onPreview} 
                        isRequired={data.status !== 'pending' && data.isTasked !== false && (data.files || []).length === 0}
                    />
                )}
            </div>

            {/* Ghi chú */}
            <div className="grid gap-2 mt-4">
                <Label htmlFor={`note-${indicator.id}`}>Ghi chú/Giải trình</Label>
                <textarea id={`note-${indicator.id}`} placeholder="Giải trình thêm..." value={data.note || ''} onChange={(e) => onNoteChange(indicator.id, e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"/>
            </div>
        </div>
    );
};
export default TC1IndicatorRenderer;
