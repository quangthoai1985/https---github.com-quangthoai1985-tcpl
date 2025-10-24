'use client';
import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Info } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EvidenceUploaderComponent from './EvidenceUploaderComponent';
import type { Criterion, Indicator } from '@/lib/data';
import type { FileWithStatus, IndicatorValue } from './types';
import { Checkbox } from '@/components/ui/checkbox';

// Function to get hardcoded options based on indicator ID
const getCheckboxOptions = (indicatorId: string, criteria: Criterion[]): string[] => {
    // ID for "Chỉ tiêu 5: Thực hiện chuyển đổi số..."
    const criterion2 = criteria.find(c => c.id === 'TC02');
    if (criterion2) {
        const indicator5 = criterion2.indicators.find(i => i.id === 'CT2.5');
        if (indicator5 && indicatorId === 'CT2.5') {
            return indicator5.contents?.map(c => c.name) || [];
        }
    }
    
    // ID for "Chỉ tiêu 3: Có sự phối hợp, huy động các tổ chức..."
    const criterion3 = criteria.find(c => c.id === 'TC03');
     if (criterion3) {
        const indicator3 = criterion3.indicators.find(i => i.id === 'CT3.3');
        if (indicator3 && indicatorId === 'CT3.3') {
             return indicator3.contents?.map(c => c.name) || [];
        }
    }
    return [];
};


// Component render chung cho các chỉ tiêu dạng Checkbox Group
const RenderCheckboxGroupIndicator = ({
    indicator,
    data,
    onValueChange,
    onNoteChange,
    onEvidenceChange,
    onPreview,
    criteria
}: {
    indicator: Indicator;
    data: IndicatorValue;
    onValueChange: (id: string, value: any) => void;
    onNoteChange: (id: string, note: string) => void;
    onEvidenceChange: (id: string, files: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus) => void;
    onPreview: (file: { name: string; url: string; }) => void;
    criteria: Criterion[];
}) => {

    const checkboxOptions = getCheckboxOptions(indicator.id, criteria);
    const valueObj = (typeof data.value === 'object' && data.value !== null && !Array.isArray(data.value)) ? data.value : {};

    const handleCheckboxChange = (option: string, checked: boolean) => {
        const newValue = { 
            ...valueObj, 
            [option]: checked 
        };
        onValueChange(indicator.id, newValue);
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
                    <Label>Kết quả tự đánh giá</Label>
                    <div className="grid gap-3">
                        {checkboxOptions.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${indicator.id}-check-${index}`}
                                    checked={valueObj[option] || false}
                                    onCheckedChange={(checked) => handleCheckboxChange(option, !!checked)}
                                />
                                <Label htmlFor={`${indicator.id}-check-${index}`} className="font-normal">{option}</Label>
                            </div>
                        ))}
                    </div>
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

export default RenderCheckboxGroupIndicator;

    