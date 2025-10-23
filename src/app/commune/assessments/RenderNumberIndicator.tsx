'use client';
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Info } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EvidenceUploaderComponent from './EvidenceUploaderComponent';
import type { Indicator } from '@/lib/data';
import type { AssessmentValues, FileWithStatus, IndicatorValue } from './types';

// Component render chung cho các chỉ tiêu dạng Number (nhập số)
const RenderNumberIndicator = ({
    indicator,
    data,
    onValueChange,
    onNoteChange,
    onEvidenceChange,
    onPreview
}: {
    indicator: Indicator;
    data: IndicatorValue;
    onValueChange: (id: string, value: any) => void;
    onNoteChange: (id: string, note: string) => void;
    onEvidenceChange: (id: string, files: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus) => void;
    onPreview: (file: { name: string; url: string; }) => void;
}) => {
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onValueChange(indicator.id, e.target.value);
    };

    const isEvidenceRequired = data.status !== 'pending' && (data.files || []).length === 0;

    return (
        <div className="grid gap-6 p-4 rounded-lg bg-card shadow-sm border">
            {/* Header */}
            <div className="flex items-center gap-2">
                <StatusBadge status={data.status} />
                <h4 className="font-semibold text-base flex-1">{indicator.name}</h4>
            </div>
            {/* Info Box */}
            <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md">
                <div className="flex items-start gap-2 text-blue-800">
                    <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                    <div>
                        <p className="text-sm">{indicator.description}</p>
                        <p className="text-sm mt-2"><strong>Yêu cầu đạt chuẩn: </strong><span className="font-semibold">{indicator.standardLevel}</span></p>
                    </div>
                </div>
            </div>
            {/* Input Area */}
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor={`number-input-${indicator.id}`}>Kết quả tự đánh giá (Số lượng hoặc Tỷ lệ %)</Label>
                    <Input
                        id={`number-input-${indicator.id}`}
                        type="number"
                        placeholder="Nhập giá trị"
                        value={data.value || ''}
                        onChange={handleInputChange}
                        className="w-48"
                    />
                </div>
                {/* Evidence */}
                <div className="grid gap-2">
                    <Label className="font-medium">Hồ sơ minh chứng</Label>
                    <p className="text-sm text-muted-foreground">{indicator.evidenceRequirement || 'Không yêu cầu cụ thể.'}</p>
                    <div className="mt-2">
                        <EvidenceUploaderComponent
                            indicatorId={indicator.id}
                            evidence={data.files || []}
                            onEvidenceChange={onEvidenceChange}
                            onPreview={onPreview}
                            isRequired={isEvidenceRequired}
                        />
                    </div>
                </div>
                {/* Note */}
                <div className="grid gap-2">
                    <Label htmlFor={`note-${indicator.id}`}>Ghi chú/Giải trình</Label>
                    <Textarea
                        id={`note-${indicator.id}`}
                        placeholder="Giải trình thêm..."
                        value={data.note || ''}
                        onChange={(e) => onNoteChange(indicator.id, e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

export default RenderNumberIndicator;
