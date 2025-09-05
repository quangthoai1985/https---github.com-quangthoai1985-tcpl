
'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, File as FileIcon, X, CornerDownRight, CheckCircle, XCircle, CircleSlash, Loader2, LinkIcon, Info, AlertTriangle } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/context/DataContext";
import PageHeader from "@/components/layout/page-header";
import type { Indicator, SubIndicator, Criterion, Assessment, IndicatorResult } from "@/lib/data";
import { Textarea } from "@/components/ui/textarea";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type AssessmentStatus = 'achieved' | 'not-achieved' | 'pending';
// Updated value structure to handle the new logic
type IndicatorValue = {
    isTasked?: boolean;
    value: any; // The actual value (percentage, boolean, text, object for checkboxes etc.)
    files: (File | { name: string, url: string })[]; // Can hold local files or uploaded file info
    note: string;
    status: AssessmentStatus;
};
type AssessmentValues = Record<string, IndicatorValue>;
type AssessmentFileUrls = Record<string, { name: string, url: string }[]>;


function EvidenceUploaderComponent({ indicatorId, evidence, onEvidenceChange, isRequired }: { indicatorId: string; evidence: (File | { name: string, url: string })[]; onEvidenceChange: (id: string, evidence: (File | { name: string, url: string })[]) => void; isRequired: boolean }) {
    const [linkInput, setLinkInput] = useState('');
    const { toast } = useToast();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files || []);
        onEvidenceChange(indicatorId, [...evidence, ...newFiles]);
    };
    
    const handleEvidenceRemove = (itemToRemove: File | { name: string, url: string }) => {
        onEvidenceChange(indicatorId, evidence.filter(item => item.name !== itemToRemove.name));
    };

    const handleAddLink = () => {
        if (!linkInput.trim() || !linkInput.startsWith('http')) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập một đường dẫn hợp lệ (bắt đầu bằng http hoặc https).' });
            return;
        }
        const newLink = { name: linkInput.trim(), url: linkInput.trim() };
        onEvidenceChange(indicatorId, [...evidence, newLink]);
        setLinkInput('');
    };

    const isLink = (item: any): item is { name: string, url: string } => {
        return typeof item.url === 'string' && (item.url.startsWith('http://') || item.url.startsWith('https://'));
    }

    return (
        <div className="grid gap-4">
            
            {/* File Upload Area */}
            <div className={cn("w-full relative border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors", isRequired && "border-destructive")}>
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                    Kéo và thả tệp vào đây, hoặc <span className="font-semibold text-primary">nhấn để chọn tệp</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Các tệp được chấp nhận: Ảnh, Video, Word, Excel, PDF. Dung lượng tối đa: 5MB.</p>
                <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple onChange={handleFileSelect} />
            </div>

            {/* Link Input Area */}
            <div className="grid gap-2">
                 <Label htmlFor={`link-${indicatorId}`}>Hoặc thêm liên kết minh chứng</Label>
                 <div className="flex gap-2">
                    <Input 
                        id={`link-${indicatorId}`}
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="Dán đường dẫn trang web, bài viết... vào đây"
                    />
                    <Button type="button" variant="outline" onClick={handleAddLink}>Thêm</Button>
                 </div>
            </div>

             {isRequired && (
                <p className="text-sm font-medium text-destructive">
                    Vui lòng cung cấp ít nhất một hồ sơ minh chứng (tệp tin hoặc liên kết).
                </p>
            )}

            {evidence.length > 0 && (
                 <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium">Minh chứng đã thêm:</p>
                    {evidence.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                            <div className="flex items-center gap-2 truncate">
                                {isLink(item) ? <LinkIcon className="h-4 w-4 flex-shrink-0 text-blue-500" /> : <FileIcon className="h-4 w-4 flex-shrink-0" />}
                                <span className="truncate">{item.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEvidenceRemove(item)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                 </div>
            )}
        </div>
    );
}

// List of indicators that should have the special "isTasked" logic.
const getSpecialLogicIndicatorIds = (criteria: Criterion[]): string[] => {
    if (!criteria || criteria.length < 3) return [];
    
    // All indicators from the first criterion
    const firstCriterionIndicatorIds = (criteria[0]?.indicators || []).flatMap(i => 
        i.subIndicators && i.subIndicators.length > 0 ? i.subIndicators.map(si => si.id) : [i.id]
    );

    const secondCriterion = criteria[1];
    let specialIdsFromSecondCriterion: string[] = [];

    // Indicator 2.2
    if (secondCriterion.indicators?.length >= 2) {
        specialIdsFromSecondCriterion.push(secondCriterion.indicators[1].id);
    }
    
    // Indicator 2.3
    if (secondCriterion.indicators?.length >= 3) {
        specialIdsFromSecondCriterion.push(secondCriterion.indicators[2].id);
    }
    
    // Subindicator 4.3 of Criterion 2
    if (secondCriterion.indicators?.length > 3 && secondCriterion.indicators[3].subIndicators?.length > 2) {
        specialIdsFromSecondCriterion.push(secondCriterion.indicators[3].subIndicators[2].id);
    }
    
    const thirdCriterion = criteria[2];
    let specialIdsFromThirdCriterion: string[] = [];
    // Subindicator 1.1 of Criterion 3
    if (thirdCriterion.indicators?.length > 0 && thirdCriterion.indicators[0].subIndicators?.length > 0) {
        specialIdsFromThirdCriterion.push(thirdCriterion.indicators[0].subIndicators[0].id);
    }
    
    // Subindicator 1.2 of Criterion 3
     if (thirdCriterion.indicators?.length > 0 && thirdCriterion.indicators[0].subIndicators?.length > 1) {
        specialIdsFromThirdCriterion.push(thirdCriterion.indicators[0].subIndicators[1].id);
    }
    
    // Subindicator 2.1 of Criterion 3
     if (thirdCriterion.indicators?.length > 1 && thirdCriterion.indicators[1].subIndicators?.length > 0) {
        specialIdsFromThirdCriterion.push(thirdCriterion.indicators[1].subIndicators[0].id);
    }


    return [...firstCriterionIndicatorIds, ...specialIdsFromSecondCriterion, ...specialIdsFromThirdCriterion];
}

const getSpecialIndicatorLabels = (indicatorId: string, criteria: Criterion[]) => {
    if (!criteria || criteria.length < 3) return { no: 'Không được giao nhiệm vụ', yes: 'Được giao nhiệm vụ' };
    
    const indicator3_tc2_id = criteria[1].indicators?.length >= 3 ? criteria[1].indicators[2].id : null;
    const subIndicator3_tc2_i4_id = criteria[1].indicators?.length > 3 && criteria[1].indicators[3].subIndicators?.length > 2 ? criteria[1].indicators[3].subIndicators[2].id : null;
    const subIndicator1_tc3_i1_id = criteria[2].indicators?.length > 0 && criteria[2].indicators[0].subIndicators?.length > 0 ? criteria[2].indicators[0].subIndicators[0].id : null;
    const subIndicator2_tc3_i1_id = criteria[2].indicators?.length > 0 && criteria[2].indicators[0].subIndicators?.length > 1 ? criteria[2].indicators[0].subIndicators[1].id : null;
    const subIndicator1_tc3_i2_id = criteria[2].indicators?.length > 1 && criteria[2].indicators[1].subIndicators?.length > 0 ? criteria[2].indicators[1].subIndicators[0].id : null;

    if (indicatorId === indicator3_tc2_id) {
        return { no: "Không yêu cầu cung cấp", yes: "Có yêu cầu cung cấp" };
    }
    
    if (indicatorId === subIndicator3_tc2_i4_id) {
        return { no: "Không phát sinh nhiệm vụ ngoài kế hoạch", yes: "Có phát sinh nhiệm vụ ngoài kế hoạch" };
    }
    
    if (indicatorId === subIndicator1_tc3_i1_id) {
        return { no: "Không phát sinh yêu cầu thành lập", yes: "Có phát sinh yêu cầu thành lập" };
    }
    
    if (indicatorId === subIndicator2_tc3_i1_id) {
        return { no: "Không phát sinh yêu cầu kiện toàn, công nhận, cho thôi hòa giải viên", yes: "Có phát sinh yêu cầu kiện toàn, công nhận, cho thôi hòa giải viên" };
    }

    if (indicatorId === subIndicator1_tc3_i2_id) {
        return { no: "Không phát sinh vụ, việc hòa giải", yes: "Có phát sinh vụ, việc hòa giải" };
    }


    return { no: 'Không được giao nhiệm vụ', yes: 'Được giao nhiệm vụ' };
}

const getCustomBooleanLabels = (indicatorId: string, criteria: Criterion[]) => {
    // Check if criteria has at least 2 elements for "Tiêu chí 2"
    if (!criteria || criteria.length < 2) return null;

    const criterion2 = criteria[1]; // Tiêu chí 2 is at index 1
    
    // Check for Indicator 4 (index 3) and its first sub-indicator (index 0)
    if (criterion2.indicators?.length > 3 && criterion2.indicators[3].subIndicators?.length > 0) {
        const subIndicator1_tc2_i4_id = criterion2.indicators[3].subIndicators[0].id;
        if (indicatorId === subIndicator1_tc2_i4_id) {
            return { true: 'Ban hành đúng thời hạn', false: 'Ban hành không đúng thời hạn' };
        }
    }
    return null; // No custom labels
}

const getCheckboxOptions = (indicatorId: string, criteria: Criterion[]) => {
    if (!criteria || criteria.length < 3) return null;
    const criterion2 = criteria[1];
    const criterion3 = criteria[2];
    
    if (criterion2.indicators?.length > 4 && indicatorId === criterion2.indicators[4].id) {
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
    
    if(criterion3.indicators?.length > 2 && indicatorId === criterion3.indicators[2].id) {
        return [
            "Huy động đội ngũ luật sư, luật gia, Hội thẩm nhân dân, lực lượng Công an nhân dân, Bộ đội Biên phòng, báo cáo viên pháp luật, tuyên truyền viên pháp luật, lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở, người đã từng là Thẩm phán, Kiểm sát viên, Điều tra viên, người đã hoặc đang công tác trong lĩnh vực pháp luật tham gia làm hòa giải viên ở cơ sở.",
            "Huy động đội ngũ nêu trên hỗ trợ pháp lý, tư vấn cho tổ hoà giải để giải quyết vụ, việc thuộc phạm vi hoà giải ở cơ sở.",
            "Huy động đội ngũ nêu trên tham gia tập huấn, bồi dưỡng cho hoà giải viên.",
            "Các hoạt động phối hợp, hỗ trợ hiệu quả của cá nhân, tổ chức khác trong triển khai công tác hòa giải ở cơ sở."
        ];
    }

    return null;
}


// Updated to pass the full data object for conditional rendering
const renderInput = (
    indicator: Indicator | SubIndicator,
    specialIndicatorIds: string[], // Pass the list of special IDs
    specialLabels: { no: string; yes: string },
    customBooleanLabels: { true: string, false: string } | null,
    checkboxOptions: string[] | null,
    data: IndicatorValue,
    onValueChange: (id: string, value: any) => void,
    onIsTaskedChange: (id: string, isTasked: boolean) => void
) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onValueChange(indicator.id, e.target.value);
    }
    
    const handleRadioChange = (val: string) => {
        onValueChange(indicator.id, val === 'true');
    }

    const handleCheckboxChange = (option: string, checked: boolean) => {
        const newValue = { ...((data.value as object) || {}), [option]: checked };
        onValueChange(indicator.id, newValue);
    };

    if (checkboxOptions) {
        return (
            <div className="grid gap-3">
                {checkboxOptions.map((option, index) => (
                     <div key={index} className="flex items-center space-x-2">
                        <Checkbox 
                            id={`${indicator.id}-check-${index}`}
                            checked={data.value?.[option] || false}
                            onCheckedChange={(checked) => handleCheckboxChange(option, !!checked)}
                        />
                        <Label htmlFor={`${indicator.id}-check-${index}`} className="font-normal">{option}</Label>
                    </div>
                ))}
            </div>
        )
    }

    // Special logic for specific indicators
    if (specialIndicatorIds.includes(indicator.id)) {
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
                     <div className="grid gap-2 pl-6 pt-2">
                        <Label htmlFor={`${indicator.id}-input`}>Tỷ lệ hoàn thành nhiệm vụ (%)</Label>
                        <Input id={`${indicator.id}-input`} type="number" placeholder="Nhập tỷ lệ %" value={data.value || ''} onChange={handleChange} />
                    </div>
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
                        <RadioGroupItem value="true" id={`${indicator.id}-true`} />
                        <Label htmlFor={`${indicator.id}-true`}>{trueLabel}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id={`${indicator.id}-false`} />
                        <Label htmlFor={`${indicator.id}-false`}>{falseLabel}</Label>
                    </div>
                </RadioGroup>
            );
        }
        case 'number':
            return (
                <div className="grid gap-2">
                    <Label htmlFor={`${indicator.id}-input`}>Tỷ lệ (%) hoặc số lượng</Label>
                    <Input id={`${indicator.id}-input`} type="number" placeholder="Nhập giá trị" value={data.value || ''} onChange={handleChange} />
                </div>
            );
        case 'select':
             return (
                <div className="grid gap-2">
                     <div className="flex items-center space-x-2">
                        <Checkbox id={`${indicator.id}-check1`} />
                        <Label htmlFor={`${indicator.id}-check1`}>Có giao diện thân thiện</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id={`${indicator.id}-check2`} />
                        <Label htmlFor={`${indicator.id}-check2`}>Cập nhật thông tin thường xuyên</Label>
                    </div>
                </div>
            );
    }
}

const evaluateStatus = (value: any, standardLevel: string, isTasked?: boolean): AssessmentStatus => {
    // If not tasked/required, it's automatically achieved.
    if (isTasked === false) {
        return 'achieved';
    }
    
    // Handle checkbox logic
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const checkedCount = Object.values(value).filter(v => v === true).length;
        const requiredCount = parseInt(standardLevel.match(/(\d+)/)?.[0] || '2', 10);
        return checkedCount >= requiredCount ? 'achieved' : 'not-achieved';
    }


    if (value === undefined || value === null || value === '') return 'pending';

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

const StatusBadge = ({ status }: { status: AssessmentStatus }) => {
    const badgeClasses = "text-sm px-3 py-1";
    switch (status) {
        case 'achieved':
            return <Badge className={cn(badgeClasses, "bg-green-600 hover:bg-green-700 text-white")}>Đạt</Badge>;
        case 'not-achieved':
            return <Badge variant="destructive" className={badgeClasses}>Không đạt</Badge>;
        case 'pending':
        default:
            return <Badge variant="outline" className={cn(badgeClasses, "border-amber-500 bg-amber-50 text-amber-800")}>Chưa chấm</Badge>;
    }
};


const IndicatorAssessment = ({ specialIndicatorIds, specialLabels, customBooleanLabels, checkboxOptions, indicator, data, onValueChange, onNoteChange, onEvidenceChange, onIsTaskedChange }: { 
    specialIndicatorIds: string[],
    specialLabels: { no: string; yes: string },
    customBooleanLabels: { true: string, false: string} | null,
    checkboxOptions: string[] | null,
    indicator: Indicator | SubIndicator,
    data: AssessmentValues[string],
    onValueChange: (id: string, value: any) => void,
    onNoteChange: (id: string, note: string) => void,
    onEvidenceChange: (id: string, files: (File | { name: string; url: string; })[]) => void,
    onIsTaskedChange: (id: string, isTasked: boolean) => void,
}) => {
    const isEvidenceRequired = data.status !== 'pending' && data.isTasked !== false && data.files.length === 0;

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
                  {renderInput(indicator, specialIndicatorIds, specialLabels, customBooleanLabels, checkboxOptions, data, onValueChange, onIsTaskedChange)}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor={`note-${indicator.id}`}>Ghi chú/Giải trình</Label>
                    <Textarea 
                        id={`note-${indicator.id}`} 
                        placeholder="Giải trình thêm về kết quả hoặc các vấn đề liên quan..." 
                        value={data.note}
                        onChange={(e) => onNoteChange(indicator.id, e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-2">
                <Label className="font-medium">Hồ sơ minh chứng</Label>
                <p className="text-sm text-muted-foreground">{indicator.evidenceRequirement || 'Không yêu cầu cụ thể.'}</p>
                <EvidenceUploaderComponent indicatorId={indicator.id} evidence={data.files} onEvidenceChange={onEvidenceChange} isRequired={isEvidenceRequired} />
            </div>
        </div>
    )
};

// Function to clean the data object for Firestore
const sanitizeDataForFirestore = (data: AssessmentValues): Record<string, IndicatorResult> => {
    const sanitizedData: Record<string, IndicatorResult> = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const indicatorData = data[key];
            sanitizedData[key] = {
                ...indicatorData,
                isTasked: indicatorData.isTasked === undefined ? null : indicatorData.isTasked,
                value: indicatorData.value === undefined ? null : indicatorData.value,
                 // Ensure files only contain URL and name for Firestore
                files: indicatorData.files.map(f => !(f instanceof File) ? f : { name: f.name, url: '' }) // Placeholder for now
            };
        }
    }
    return sanitizedData;
};


export default function SelfAssessmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { storage, currentUser, assessmentPeriods, criteria, assessments, updateAssessments } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initializeState = useCallback((criteria: Criterion[], existingData?: Record<string, IndicatorResult>): AssessmentValues => {
      const initialState: AssessmentValues = {};
      criteria.forEach(criterion => {
          (criterion.indicators || []).forEach(indicator => {
              const processIndicator = (sub: Indicator | SubIndicator) => {
                  const saved = existingData?.[sub.id];
                  initialState[sub.id] = { 
                      isTasked: saved?.isTasked, 
                      value: saved?.value ?? '', 
                      files: saved?.files ?? [], 
                      note: saved?.note ?? '', 
                      status: saved?.status ?? 'pending' 
                  };
              };
              if (indicator.subIndicators && indicator.subIndicators.length > 0) {
                  indicator.subIndicators.forEach(processIndicator);
              } else {
                  processIndicator(indicator);
              }
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
    // This effect runs when the user's assessment data becomes available from the context
    if (myAssessment?.assessmentData) {
        setAssessmentData(initializeState(criteria, myAssessment.assessmentData));
    }
  }, [myAssessment, criteria, initializeState]);

  const specialLogicIndicatorIds = React.useMemo(() => getSpecialLogicIndicatorIds(criteria), [criteria]);

  const findIndicator = (indicatorId: string) => {
    for (const c of criteria) {
        for (const i of (c.indicators || [])) {
            if (i.id === indicatorId) return i;
            if (i.subIndicators) {
                const sub = i.subIndicators.find(si => si.id === indicatorId);
                if (sub) return sub;
            }
        }
    }
    return null;
  }

  const handleIsTaskedChange = (indicatorId: string, isTasked: boolean) => {
    const indicator = findIndicator(indicatorId);
    if (indicator) {
        const valueToEvaluate = isTasked ? assessmentData[indicatorId].value : null;
        const newStatus = evaluateStatus(valueToEvaluate, indicator.standardLevel, isTasked);
        setAssessmentData(prev => ({
            ...prev,
            [indicatorId]: {
                ...prev[indicatorId],
                isTasked: isTasked,
                status: newStatus,
                files: isTasked ? prev[indicatorId].files : [], // Clear files if not tasked
            }
        }));
    }
  }


  const handleValueChange = (indicatorId: string, value: any) => {
    const indicator = findIndicator(indicatorId);
    if (indicator) {
        const isTasked = assessmentData[indicatorId].isTasked;
        const newStatus = evaluateStatus(value, indicator.standardLevel, isTasked);
        setAssessmentData(prev => ({
            ...prev,
            [indicatorId]: {
                ...prev[indicatorId],
                value: value,
                status: newStatus
            }
        }));
    }
  };
  
  const handleNoteChange = (indicatorId: string, note: string) => {
    setAssessmentData(prev => ({
        ...prev,
        [indicatorId]: {
            ...prev[indicatorId],
            note: note,
        }
    }));
  };


  const handleEvidenceChange = (indicatorId: string, evidence: (File | { name: string, url: string })[]) => {
      setAssessmentData(prev => ({
          ...prev,
          [indicatorId]: {
              ...prev[indicatorId],
              files: evidence
          }
      }))
  }

  const uploadEvidenceFiles = async (periodId: string, communeId: string): Promise<AssessmentFileUrls> => {
    if (!storage) throw new Error("Firebase Storage is not initialized.");

    const uploadedFileUrls: AssessmentFileUrls = {};
    const allUploadPromises: Promise<void>[] = [];

    for (const indicatorId in assessmentData) {
        const indicatorData = assessmentData[indicatorId];
        
        // Separate local files from existing links/files
        const localFilesToUpload = indicatorData.files.filter((f): f is File => f instanceof File);
        const existingEvidence = indicatorData.files.filter((f): f is {name: string, url: string} => !(f instanceof File));
        
        uploadedFileUrls[indicatorId] = existingEvidence;

        if (localFilesToUpload.length > 0) {
            const indicatorPromises = localFilesToUpload.map(async file => {
                const filePath = `hoso/${communeId}/evidence/${periodId}/${indicatorId}/${file.name}`;
                const storageRef = ref(storage, filePath);
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                uploadedFileUrls[indicatorId].push({ name: file.name, url: downloadURL });
            });
            allUploadPromises.push(...indicatorPromises);
        }
    }

    await Promise.all(allUploadPromises);
    return uploadedFileUrls;
}


  const handleSaveDraft = async () => {
    if (!activePeriod || !currentUser) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy kỳ đánh giá hoặc người dùng.' });
        return;
    }

    const currentAssessment = assessments.find(a => a.assessmentPeriodId === activePeriod.id && a.communeId === currentUser.communeId);
    if (!currentAssessment) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy hồ sơ đăng ký hợp lệ để lưu nháp.' });
        return;
    }

    setIsSubmitting(true);
    toast({ title: 'Đang lưu nháp...' });
    
    try {
        const dataToSave = sanitizeDataForFirestore(assessmentData);

        const updatedAssessment: Assessment = {
            ...currentAssessment,
            assessmentStatus: 'draft',
            assessmentData: dataToSave,
        };
        
        await updateAssessments(assessments.map(a => a.id === updatedAssessment.id ? updatedAssessment : a));

        toast({
          title: "Lưu nháp thành công!",
          description: "Bạn có thể tiếp tục chỉnh sửa sau.",
        });
    } catch (error) {
        console.error("Draft saving error:", error);
        toast({ variant: 'destructive', title: 'Lỗi khi lưu nháp', description: 'Đã xảy ra lỗi khi lưu dữ liệu.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const { canSubmit, submissionErrors } = useMemo(() => {
        const errors = [];
        let allIndicatorsAssessed = true;
        let allEvidenceProvided = true;

        for (const id in assessmentData) {
            const data = assessmentData[id];
            if (data.status === 'pending') {
                allIndicatorsAssessed = false;
            }
            if (data.status !== 'pending' && data.isTasked !== false && data.files.length === 0) {
                allEvidenceProvided = false;
            }
        }
        
        if (!allIndicatorsAssessed) {
            errors.push("Bạn phải hoàn thành việc chấm điểm cho tất cả các chỉ tiêu.");
        }
        if (!allEvidenceProvided) {
            errors.push("Bạn phải cung cấp minh chứng cho tất cả các chỉ tiêu đã chấm (trừ các chỉ tiêu được đánh dấu 'Không được giao nhiệm vụ').");
        }

        return { canSubmit: errors.length === 0, submissionErrors: errors };
    }, [assessmentData]);

  const handleSubmit = async () => {
    if (!activePeriod || !currentUser || !storage) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy kỳ đánh giá, người dùng hoặc dịch vụ lưu trữ.' });
        return;
    }

    setIsSubmitting(true);
    toast({ title: 'Đang gửi hồ sơ...', description: 'Vui lòng chờ trong giây lát.' });

    try {
        const fileUrls = await uploadEvidenceFiles(activePeriod.id, currentUser.communeId);
        
        // Create a serializable version of assessmentData with file URLs, also sanitizing it
        const sanitizedData = sanitizeDataForFirestore(assessmentData);
        const assessmentDataForFirestore = Object.entries(sanitizedData).reduce((acc, [key, value]) => {
            acc[key] = {
                ...value,
                files: fileUrls[key] || [], // Use the uploaded URLs
            };
            return acc;
        }, {} as Record<string, IndicatorResult>);

        const myAssessment = assessments.find(a => a.assessmentPeriodId === activePeriod.id && a.communeId === currentUser.communeId);
        
        if (!myAssessment) {
             toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy hồ sơ đăng ký hợp lệ.' });
             setIsSubmitting(false);
             return;
        }

        const updatedAssessment: Assessment = {
            ...myAssessment,
            assessmentStatus: 'pending_review',
            assessmentSubmissionDate: new Date().toLocaleDateString('vi-VN'),
            submittedBy: currentUser.id,
            assessmentData: assessmentDataForFirestore,
        };

        await updateAssessments(assessments.map(a => a.id === myAssessment.id ? updatedAssessment : a));

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
            {activePeriod ? (
                <>
                <CardContent>
                    <Accordion type="multiple" defaultValue={criteria.map(c => c.id)} className="w-full">
                        {criteria.map((criterion, index) => (
                            <AccordionItem value={criterion.id} key={criterion.id}>
                                <AccordionTrigger className="font-headline text-lg">Tiêu chí {index+1}: {criterion.name.replace(`Tiêu chí ${index + 1}: `, '')}</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-8 pl-4 border-l-2 border-primary/20 ml-2 py-4">
                                        {(criterion.indicators || []).map(indicator => {
                                            const status = assessmentData[indicator.id]?.status;
                                            const blockClasses = cn(
                                                "grid gap-6 p-4 rounded-lg bg-card shadow-sm border transition-colors",
                                                status === 'achieved' && 'bg-green-50 border-green-200',
                                                status === 'not-achieved' && 'bg-red-50 border-red-200',
                                                status === 'pending' && 'bg-amber-50 border-amber-200'
                                            );

                                            return (
                                                <div key={indicator.id} className={blockClasses}>
                                                    {(!indicator.subIndicators || indicator.subIndicators.length === 0) ? (
                                                        <IndicatorAssessment 
                                                            specialIndicatorIds={specialLogicIndicatorIds}
                                                            specialLabels={getSpecialIndicatorLabels(indicator.id, criteria)}
                                                            customBooleanLabels={getCustomBooleanLabels(indicator.id, criteria)}
                                                            checkboxOptions={getCheckboxOptions(indicator.id, criteria)}
                                                            indicator={indicator} 
                                                            data={assessmentData[indicator.id]} 
                                                            onValueChange={handleValueChange}
                                                            onNoteChange={handleNoteChange}
                                                            onEvidenceChange={handleEvidenceChange}
                                                            onIsTaskedChange={handleIsTaskedChange}
                                                        />
                                                    ) : (
                                                        <>
                                                            <div>
                                                              <h4 className="font-semibold text-base">{indicator.name}</h4>
                                                              <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md mt-3">
                                                                  <div className="flex items-start gap-2 text-blue-800">
                                                                      <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                                                                      <p className="text-sm">{indicator.description}</p>
                                                                  </div>
                                                              </div>
                                                            </div>
                                                            <div className="mt-4 pl-6 space-y-6 border-l-2 border-dashed">
                                                              {(indicator.subIndicators || []).map(sub => {
                                                                    const subStatus = assessmentData[sub.id]?.status;
                                                                    const subBlockClasses = cn(
                                                                        "relative pl-6 transition-colors rounded-r-lg py-4",
                                                                         subStatus === 'achieved' && 'bg-green-50',
                                                                         subStatus === 'not-achieved' && 'bg-red-50',
                                                                         subStatus === 'pending' && 'bg-amber-50 border-l-amber-200'
                                                                    );
                                                                    return (
                                                                      <div key={sub.id} className={subBlockClasses}>
                                                                          <CornerDownRight className="absolute -left-3 top-5 h-5 w-5 text-muted-foreground"/>
                                                                          <IndicatorAssessment
                                                                              specialIndicatorIds={specialLogicIndicatorIds}
                                                                              specialLabels={getSpecialIndicatorLabels(sub.id, criteria)}
                                                                              customBooleanLabels={getCustomBooleanLabels(sub.id, criteria)}
                                                                              checkboxOptions={getCheckboxOptions(sub.id, criteria)}
                                                                              indicator={sub} 
                                                                              data={assessmentData[sub.id]}
                                                                              onValueChange={handleValueChange}
                                                                              onNoteChange={handleNoteChange}
                                                                              onEvidenceChange={handleEvidenceChange}
                                                                              onIsTaskedChange={handleIsTaskedChange}
                                                                          />
                                                                      </div>
                                                                    )
                                                              })}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
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
    </>
  );
}
