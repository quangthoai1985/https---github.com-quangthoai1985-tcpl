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

// Component render chung cho các chỉ tiêu dạng Tỷ lệ % (2 ô input)
const RenderPercentageRatioIndicator = ({
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

    // Lấy giá trị total/completed từ data.value (là object)
    const valueObj = (typeof data.value === 'object' && data.value !== null) ? data.value : { total: '', completed: '', provided: '' }; // Thêm provided cho CT2.3
    const total = Number(valueObj.total || 0);
    // Ưu tiên 'completed' (CT4.2, CT3.2.2), nếu không có thì dùng 'provided' (CT2.3)
    const completedOrProvided = Number(valueObj.completed || valueObj.provided || 0);
    const percentage = total > 0 ? Math.round((completedOrProvided / total) * 100) : 0;

    // Xác định tên trường dựa trên ID (cần tùy chỉnh nếu có nhiều loại)
    const totalLabel = indicator.id === 'CT2.3' ? "Tổng số yêu cầu" : "Tổng số nhiệm vụ/vụ việc";
    const completedLabel = indicator.id === 'CT2.3' ? "Số yêu cầu đã cung cấp" : "Số nhiệm vụ/vụ việc hoàn thành/thành công";
    const totalKey = 'total';
    const completedKey = indicator.id === 'CT2.3' ? 'provided' : 'completed';


    const handleInputChange = (field: 'total' | 'completed' | 'provided', inputValue: string) => {
         const newValueObj = {
             ...valueObj,
             [field]: inputValue // Cập nhật field tương ứng
         };
         // Xóa key không liên quan để tránh lưu thừa
         if (field === 'completed') delete newValueObj.provided;
         if (field === 'provided') delete newValueObj.completed;

         onValueChange(indicator.id, newValueObj);
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
                 {/* 2 ô Input */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 items-end">
                    <div className="grid gap-1.5">
                       <Label htmlFor={`ratio-total-${indicator.id}`}>{totalLabel}</Label>
                       <Input id={`ratio-total-${indicator.id}`} type="number" placeholder="VD: 10" value={valueObj[totalKey] || ''}
                              onChange={(e) => handleInputChange(totalKey as 'total', e.target.value)} />
                    </div>
                     <div className="grid gap-1.5">
                       <Label htmlFor={`ratio-completed-${indicator.id}`}>{completedLabel}</Label>
                       <Input id={`ratio-completed-${indicator.id}`} type="number" placeholder="VD: 8" value={valueObj[completedKey] || ''}
                              onChange={(e) => handleInputChange(completedKey as 'completed' | 'provided', e.target.value)} />
                    </div>
                     <div className="text-center md:text-left">
                       <Label className="text-xs font-normal">Tỷ lệ hoàn thành</Label>
                       <p className="text-2xl font-bold">{percentage}%</p>
                     </div>
                 </div>
                  {/* Evidence */}
                 <div className="grid gap-2 mt-4">
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

export default RenderPercentageRatioIndicator;
