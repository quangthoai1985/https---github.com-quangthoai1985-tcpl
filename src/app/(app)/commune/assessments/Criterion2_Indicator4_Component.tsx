'use client';

import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import type { AssessmentValues, FileWithStatus } from "./types";
import type { Criterion, Indicator } from "@/lib/data";
import { Info, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import StatusBadge from "./StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CT4EvidenceUploader from "./CT4EvidenceUploader";
import EvidenceUploaderComponent from './EvidenceUploaderComponent';

const Criterion2_Indicator4_Component = ({
    indicator,
    assessmentData,
    onValueChange,
    onNoteChange,
    onEvidenceChange,
    onPreview,
    periodId,
    communeId
}: {
    indicator: Indicator;
    assessmentData: AssessmentValues;
    onValueChange: (id: string, value: any, contentId?: string) => void;
    onNoteChange: (id: string, note: string, contentId?: string) => void;
    onEvidenceChange: (id: string, files: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus, contentId?: string) => void;
    onPreview: (file: { name: string; url: string; }) => void;
    periodId: string;
    communeId: string;
}) => {
    
    // Tách 2 nội dung của CT4 ra
    const content1 = indicator.contents?.[0];
    const content2 = indicator.contents?.[1];

    if (!content1 || !content2) return <div className="text-destructive">Lỗi cấu hình: Chỉ tiêu 4 (CT033278) phải có 2 nội dung.</div>;

    const data = assessmentData[indicator.id];
    const content1Data = data?.contentResults?.[content1.id];
    const content2Data = data?.contentResults?.[content2.id];

    const [provincialPlanDate, setProvincialPlanDate] = useState(() => 
        (content1Data?.value && typeof content1Data.value === 'object') ? content1Data.value.provincialPlanDate || '' : ''
    );

    if (!data || !content1Data || !content2Data) return <div>Đang tải nội dung Chỉ tiêu 4...</div>;

    const blockClasses = cn(
        "grid gap-6 p-4 rounded-lg bg-card shadow-sm border transition-colors",
        data.status === 'achieved' && 'bg-green-50 border-green-200',
        data.status === 'not-achieved' && 'bg-red-50 border-red-200',
        data.status === 'pending' && 'bg-amber-50 border-amber-200'
    );

    const subBlockClasses = (status: 'achieved' | 'not-achieved' | 'pending') => cn(
        "relative pl-6 transition-colors rounded-r-lg py-4 border-l-2 border-dashed",
        status === 'achieved' && 'bg-green-50',
        status === 'not-achieved' && 'bg-red-50',
        status === 'pending' && 'bg-amber-50 border-l-amber-200'
    );

    return (
        <div className={blockClasses}>
            <div className="flex items-center gap-2">
                <StatusBadge status={data.status} />
                <h4 className="font-semibold text-base flex-1">{indicator.name}</h4>
            </div>

            {/* Render NỘI DUNG 1 (Kế hoạch) */}
            <div className={subBlockClasses(content1Data.status)}>
                <div className="flex items-center gap-2 mb-4">
                    <StatusBadge status={content1Data.status} />
                    <h5 className="font-semibold text-base flex-1">{content1.name}</h5>
                </div>
                <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md">
                    <div className="flex items-start gap-2 text-blue-800">
                        <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                        <p className="text-sm">{content1.description}</p>
                    </div>
                </div>
                
                {/* KHỐI CODE MỚI THÊM VÀO: Ô NHẬP NGÀY */}
                <div className="grid gap-2 mt-4 p-3 border rounded-md bg-background">
                    <Label htmlFor="provincialPlanDate" className="font-medium text-destructive">
                        Khai báo Ngày ban hành Kế hoạch của Tỉnh
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        Nhập ngày ban hành (theo định dạng DD/MM/YYYY) của văn bản cấp Tỉnh. 
                        Đây là căn cứ để hệ thống tính 7 ngày làm việc.
                    </p>
                    <Input 
                        id="provincialPlanDate"
                        placeholder="DD/MM/YYYY" 
                        className="w-48"
                        value={provincialPlanDate}
                        onChange={(e) => setProvincialPlanDate(e.target.value)}
                        onBlur={() => {
                            const newValue = { ...((content1Data.value && typeof content1Data.value === 'object') ? content1Data.value : {}), provincialPlanDate: provincialPlanDate };
                            onValueChange(indicator.id, newValue, content1.id);
                        }}
                    />
                </div>
                {/* KẾT THÚC KHỐI CODE MỚI */}
                {/* Giao diện upload đặc biệt cho CT4 */}
                <div className="grid gap-2 mt-4">
                    <Label className="font-medium">Hồ sơ minh chứng</Label>
                    <Alert variant="destructive" className="border-amber-500 text-amber-900 bg-amber-50 [&>svg]:text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="font-semibold text-amber-800">Lưu ý</AlertTitle>
                        <AlertDescription>Tệp PDF tải lên sẽ được kiểm tra chữ ký số (yêu cầu logic 7 ngày làm việc).</AlertDescription>
                    </Alert>
                    
                    <CT4EvidenceUploader
                        indicatorId={indicator.id}
                        docIndex={0} // docIndex không còn quá quan trọng ở đây, nhưng vẫn truyền để giữ cấu trúc
                        evidence={content1Data.files}
                        onUploadComplete={(indicatorId, docIndex, newFile) => onEvidenceChange(indicatorId, [newFile], docIndex, undefined, content1.id)}
                        onRemove={(indicatorId, docIndex, fileToRemove) => onEvidenceChange(indicatorId, [], docIndex, fileToRemove, content1.id)}
                        onAddLink={(indicatorId, docIndex, link) => onEvidenceChange(indicatorId, [link], docIndex, undefined, content1.id)}
                        onPreview={onPreview}
                        periodId={periodId}
                        communeId={communeId}
                        accept=".pdf"
                    />
                </div>
                 <div className="grid gap-2 mt-4">
                    <Label htmlFor={`note-${indicator.id}-${content1.id}`}>Ghi chú/Giải trình</Label>
                    <textarea 
                        id={`note-${indicator.id}-${content1.id}`} 
                        placeholder="Giải trình thêm..." 
                        value={content1Data.note || ''} 
                        onChange={(e) => onNoteChange(indicator.id, e.target.value, content1.id)} 
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    />
                </div>
            </div>

            {/* Render NỘI DUNG 2 (Tỷ lệ) */}
            <div className={subBlockClasses(content2Data.status)}>
                <div className="flex items-center gap-2 mb-4">
                    <StatusBadge status={content2Data.status} />
                    <h5 className="font-semibold text-base flex-1">{content2.name}</h5>
                </div>
                 <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md">
                    <div className="flex items-start gap-2 text-blue-800">
                        <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                        <p className="text-sm">{content2.description}</p>
                    </div>
                </div>
                
                {/* Giao diện nhập liệu đặc biệt cho CT4 */}
                <div className="grid gap-2 mt-4">
                    <Label htmlFor={`ct4-content2-input`}>Tỷ lệ %</Label>
                    <Input 
                        id={`ct4-content2-input`}
                        type="number" 
                        placeholder="Nhập 100" 
                        value={content2Data.value || ''} 
                        onChange={(e) => onValueChange(indicator.id, e.target.value, content2.id)} 
                        className="w-48"
                    />
                </div>
                <div className="grid gap-2 mt-4">
                    <Label className="font-medium">Hồ sơ minh chứng</Label>
                    <EvidenceUploaderComponent
                        indicatorId={indicator.id}
                        contentId={content2.id}
                        evidence={content2Data.files}
                        onEvidenceChange={onEvidenceChange}
                        onPreview={onPreview}
                        isRequired={content2Data.status === 'not-achieved' && content2Data.files.length === 0}
                        parentIndicatorId={indicator.id}
                    />
                </div>
                 <div className="grid gap-2 mt-4">
                    <Label htmlFor={`note-${indicator.id}-${content2.id}`}>Ghi chú/Giải trình</Label>
                    <textarea 
                        id={`note-${indicator.id}-${content2.id}`} 
                        placeholder="Giải trình thêm..." 
                        value={content2Data.note || ''} 
                        onChange={(e) => onNoteChange(indicator.id, e.target.value, content2.id)} 
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    />
                </div>
            </div>
        </div>
    );
};

export default Criterion2_Indicator4_Component;
