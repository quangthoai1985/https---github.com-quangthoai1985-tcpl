'use client';
import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Info } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EvidenceUploaderComponent from './EvidenceUploaderComponent';
import type { Indicator } from '@/lib/data';
import type { FileWithStatus, IndicatorValue } from './types';
import { Checkbox } from '@/components/ui/checkbox';

// Function to get hardcoded options based on indicator ID
const getCheckboxOptions = (indicatorId: string): string[] => {
    // ID for "Chỉ tiêu 5: Thực hiện chuyển đổi số..."
    if (indicatorId === 'CT2.5') { 
        return [
            "Tổ chức cuộc thi tìm hiểu pháp luật trực tuyến", 
            "Tổ chức tập huấn phổ biến kiến thức pháp luật và kỹ năng phổ biến, giáo dục pháp luật cho đội ngũ nhân lực làm công tác phổ biến, giáo dục pháp luật bằng hình thức trực tuyến", 
            "Phổ biến, giáo dục pháp luật trên Cổng Thông tin điện tử/Trang Thông tin điện tử của Hội đồng nhân dân, Uỷ ban nhân dân cấp xã và có sự kết nối với Cổng Pháp luật Quốc gia (đối với cấp xã đã có Cổng/Trang thông tin điện tử)", 
            "Sử dụng mạng xã hội và các nền tảng cộng đồng trực tuyến khác để thực hiện phổ biến, giáo dục pháp luật", 
            "Xây dựng, số hoá các tài liệu, sản phẩm truyền thông, phổ biến, giáo dục pháp luật như video clip, podcast, audio...", 
            "Xây dựng chatbox giải đáp pháp luật", 
            "Phổ biến, giáo dục pháp luật thông qua tin nhắn điện thoại", 
            "Hoạt động khác về chuyển đổi số, ứng dụng công nghệ số bảo đảm phù hợp"
        ];
    }
    // ID for "Chỉ tiêu 3: Có sự phối hợp, huy động các tổ chức..."
    if (indicatorId === 'CT3.3') { 
        return [
            "Huy động đội ngũ luật sư, luật gia, Hội thẩm nhân dân, lực lượng Công an nhân dân, Bộ đội Biên phòng, báo cáo viên pháp luật, tuyên truyền viên pháp luật, lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở, người đã từng là Thẩm phán, Kiểm sát viên, Điều tra viên, người đã hoặc đang công tác trong lĩnh vực pháp luật tham gia làm hòa giải viên ở cơ sở.",
            "Huy động đội ngũ nêu trên hỗ trợ pháp lý, tư vấn cho tổ hoà giải để giải quyết vụ, việc thuộc phạm vi hoà giải ở cơ sở.",
            "Huy động đội ngũ nêu trên tham gia tập huấn, bồi dưỡng cho hoà giải viên.",
            "Các hoạt động phối hợp, hỗ trợ hiệu quả của cá nhân, tổ chức khác trong triển khai công tác hòa giải ở cơ sở."
        ];
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
    onPreview
}: {
    indicator: Indicator;
    data: IndicatorValue;
    onValueChange: (id: string, value: any) => void;
    onNoteChange: (id: string, note: string) => void;
    onEvidenceChange: (id: string, files: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus) => void;
    onPreview: (file: { name: string; url: string; }) => void;
}) => {

    const checkboxOptions = getCheckboxOptions(indicator.id);
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
