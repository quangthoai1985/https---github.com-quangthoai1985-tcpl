

'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, File as FileIcon, X, CornerDownRight, CheckCircle, XCircle, CircleSlash, Loader2, LinkIcon, Info, AlertTriangle, FileUp, ListChecks, Eye, Download } from "lucide-react";
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
    isTasked?: boolean;
    value: any; 
    files: FileWithStatus[];
    filesPerDocument?: { [documentIndex: number]: FileWithStatus[] };
    note: string;
    status: AssessmentStatus;
    adminNote?: string;
    communeNote?: string;
};
type AssessmentValues = Record<string, IndicatorValue>;


function EvidenceUploaderComponent({ indicatorId, evidence, onEvidenceChange, isRequired, onPreview, docIndex, accept }: { 
    indicatorId: string; 
    evidence: FileWithStatus[]; 
    onEvidenceChange: (id: string, evidence: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus) => void; 
    isRequired: boolean;
    onPreview: (file: { name: string, url: string }) => void;
    docIndex?: number;
    accept?: string;
}) {
    const [linkInput, setLinkInput] = useState('');
    const { toast } = useToast();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files || []);
        onEvidenceChange(indicatorId, [...evidence, ...newFiles], docIndex);
    };
    
    const handleEvidenceRemove = (itemToRemove: FileWithStatus) => {
        onEvidenceChange(indicatorId, [], docIndex, itemToRemove);
    };

    const handleAddLink = () => {
        if (!linkInput.trim() || !linkInput.startsWith('http')) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập một đường dẫn hợp lệ (bắt đầu bằng http hoặc https).' });
            return;
        }
        const newLink = { name: linkInput.trim(), url: linkInput.trim() };
        onEvidenceChange(indicatorId, [...evidence, newLink], docIndex);
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
                 <Label htmlFor={`link-${indicatorId}-${docIndex}`} className="text-xs">Hoặc thêm liên kết</Label>
                 <div className="flex gap-2">
                    <Input 
                        id={`link-${indicatorId}-${docIndex}`}
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
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                {isLink(item) ? <LinkIcon className="h-4 w-4 flex-shrink-0 text-blue-500" /> : <FileIcon className="h-4 w-4 flex-shrink-0" />}
                                <span className="truncate text-xs flex-1">{item.name}</span>
                            </div>
                             <div className="flex items-center gap-1">
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
    
    const firstCriterionIndicatorIds = (criteria[0]?.indicators || []).flatMap(i => 
        i.subIndicators && i.subIndicators.length > 0 ? i.subIndicators.map(si => si.id) : [i.id]
    );

    const secondCriterion = criteria[1];
    let specialIdsFromSecondCriterion: string[] = [];

    if (secondCriterion.indicators?.length >= 2) {
        specialIdsFromSecondCriterion.push(secondCriterion.indicators[1].id);
    }
    
    if (secondCriterion.indicators?.length >= 3) {
        specialIdsFromSecondCriterion.push(secondCriterion.indicators[2].id);
    }
    
    if (secondCriterion.indicators?.length > 3 && secondCriterion.indicators[3].subIndicators?.length > 2) {
        specialIdsFromSecondCriterion.push(secondCriterion.indicators[3].subIndicators[2].id);
    }
    
    const thirdCriterion = criteria[2];
    let specialIdsFromThirdCriterion: string[] = [];
    if (thirdCriterion.indicators?.length > 0 && thirdCriterion.indicators[0].subIndicators?.length > 0) {
        specialIdsFromThirdCriterion.push(thirdCriterion.indicators[0].subIndicators[0].id);
    }
    
     if (thirdCriterion.indicators?.length > 0 && thirdCriterion.indicators[0].subIndicators?.length > 1) {
        specialIdsFromThirdCriterion.push(thirdCriterion.indicators[0].subIndicators[1].id);
    }
    
     if (thirdCriterion.indicators?.length > 1 && thirdCriterion.indicators[1].subIndicators?.length > 0) {
        specialIdsFromThirdCriterion.push(thirdCriterion.indicators[1].subIndicators[0].id);
    }

    return [...specialIdsFromSecondCriterion];
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
    if (!criteria || criteria.length < 2) return null;

    const criterion2 = criteria[1]; 
    
    if (criterion2.indicators?.length > 3 && criterion2.indicators[3].subIndicators?.length > 0) {
        const subIndicator1_tc2_i4_id = criterion2.indicators[3].subIndicators[0].id;
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


const renderInput = (
    indicator: Indicator | SubIndicator,
    specialIndicatorIds: string[],
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

const evaluateStatus = (value: any, standardLevel: string, isTasked?: boolean, assignedCount?: number, filesPerDocument?: { [documentIndex: number]: FileWithStatus[] }): AssessmentStatus => {
    if (isTasked === false) {
        return 'achieved';
    }

    if (assignedCount && assignedCount > 0) {
        const enteredValue = Number(value);
        if (isNaN(enteredValue) || value === '' || value === null || enteredValue < assignedCount) return 'pending';
        
        const allFilesValid = Object.values(filesPerDocument || {}).flat().every(f => 'signatureStatus' in f && f.signatureStatus === 'valid');
        if (!allFilesValid) return 'not-achieved';
        
        return enteredValue >= assignedCount ? 'achieved' : 'not-achieved';
    }
    
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


const IndicatorAssessment = ({ specialIndicatorIds, specialLabels, customBooleanLabels, checkboxOptions, indicator, data, onValueChange, onNoteChange, onEvidenceChange, onIsTaskedChange, onPreview }: { 
    specialIndicatorIds: string[],
    specialLabels: { no: string; yes: string },
    customBooleanLabels: { true: string, false: string} | null,
    checkboxOptions: string[] | null,
    indicator: Indicator | SubIndicator,
    data: AssessmentValues[string],
    onValueChange: (id: string, value: any) => void,
    onNoteChange: (id: string, note: string) => void,
    onEvidenceChange: (id: string, files: (File | { name: string; url: string; })[], docIndex?: number, fileToRemove?: FileWithStatus) => void,
    onIsTaskedChange: (id: string, isTasked: boolean) => void,
    onPreview: (file: {name: string, url: string}) => void,
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
                <div className="mt-2">
                    <EvidenceUploaderComponent indicatorId={indicator.id} evidence={data.files} onEvidenceChange={onEvidenceChange} onPreview={onPreview} isRequired={isEvidenceRequired} />
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
            const sanitizeFiles = (files: FileWithStatus[]) => files.map(f => {
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
                note: indicatorData.note,
                status: indicatorData.status,
                adminNote: indicatorData.adminNote,
                communeNote: indicatorData.communeNote,
                files: sanitizeFiles(indicatorData.files),
                filesPerDocument: indicatorData.filesPerDocument ? Object.fromEntries(
                    Object.entries(indicatorData.filesPerDocument).map(([idx, fileList]) => [idx, sanitizeFiles(fileList)])
                ) : {},
            };
        }
    }
    return sanitizedData;
};

const Criterion1EvidenceUploader = ({ indicatorId, docIndex, evidence, onUploadComplete, onRemove, onPreview, periodId, communeId }: {
    indicatorId: string;
    docIndex: number;
    evidence: FileWithStatus[];
    onUploadComplete: (indicatorId: string, docIndex: number, newFile: { name: string, url: string }) => void;
    onRemove: (indicatorId: string, docIndex: number, fileToRemove: FileWithStatus) => void;
    onPreview: (file: { name: string, url: string }) => void;
    periodId: string;
    communeId: string;
}) => {
    const { storage } = useData();
    const { toast } = useToast();
    const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const filesToUpload = Array.from(e.target.files || []);
        if (filesToUpload.length === 0 || !storage) return;

        for (const file of filesToUpload) {
            setUploadingFiles(prev => [...prev, file.name]);
            try {
                const filePath = `hoso/${communeId}/evidence/${periodId}/${indicatorId}/${docIndex}/${file.name}`;
                const storageRef = ref(storage, filePath);
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                onUploadComplete(indicatorId, docIndex, { name: file.name, url: downloadURL });
                toast({ title: 'Thành công', description: `Đã tải lên tệp: ${file.name}` });
            } catch (error) {
                console.error("Upload error:", error);
                toast({ variant: 'destructive', title: 'Lỗi tải tệp', description: `Không thể tải lên tệp: ${file.name}` });
            } finally {
                setUploadingFiles(prev => prev.filter(fname => fname !== file.name));
            }
        }
    };
    
    const isRequired = evidence.length === 0;

    const SignatureStatusBadge = ({ file }: { file: FileWithStatus }) => {
        if (!('signatureStatus' in file) || !file.signatureStatus) return null;

        const statusMap = {
            validating: { text: 'Đang kiểm tra...', className: 'bg-yellow-400', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
            valid: { text: 'Hợp lệ', className: 'bg-green-500', icon: <CheckCircle className="h-3 w-3" /> },
            invalid: { text: 'Không hợp lệ', className: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
            error: { text: 'Lỗi kiểm tra', className: 'bg-gray-500', icon: <AlertTriangle className="h-3 w-3" /> }
        };
        const currentStatus = statusMap[file.signatureStatus];

        return (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Badge className={`${currentStatus.className} text-white text-[10px] h-5`}>
                            {currentStatus.icon}
                            <span className="ml-1">{currentStatus.text}</span>
                        </Badge>
                    </TooltipTrigger>
                     {((file.signatureStatus === 'invalid' || file.signatureStatus === 'error') && file.signatureError) && (
                        <TooltipContent>
                            <p>{file.signatureError}</p>
                        </TooltipContent>
                     )}
                </Tooltip>
            </TooltipProvider>
        );
    };

    const ContentCheckBadge = ({ file }: { file: FileWithStatus }) => {
        if (!('contentCheckStatus' in file) || !file.contentCheckStatus || file.contentCheckStatus === 'not_checked') return null;

        const statusMap = {
            passed: { text: 'Thể thức hợp lệ', className: 'bg-green-500', icon: <CheckCircle className="h-3 w-3" /> },
            failed: { text: 'Lỗi thể thức', className: 'bg-amber-500', icon: <AlertTriangle className="h-3 w-3" /> },
        };
        const currentStatus = statusMap[file.contentCheckStatus];
         if (!currentStatus) return null;


        const badge = (
             <Badge className={`${currentStatus.className} text-white text-[10px] h-5`}>
                {currentStatus.icon}
                <span className="ml-1">{currentStatus.text}</span>
            </Badge>
        );

        if (file.contentCheckStatus === 'failed' && file.contentCheckIssues && file.contentCheckIssues.length > 0) {
             return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>{badge}</TooltipTrigger>
                        <TooltipContent>
                            <ul className="list-disc pl-4">
                                {file.contentCheckIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                            </ul>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        return badge;
    }


    return (
        <div className="grid gap-4">
            <div className={cn("w-full relative border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors", isRequired && "border-destructive")}>
                <FileUp className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">Chỉ chấp nhận tệp PDF. Tệp sẽ được tải lên và kiểm tra ngay lập tức.</p>
                <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple onChange={handleFileSelect} accept=".pdf" disabled={uploadingFiles.length > 0}/>
            </div>

            {evidence.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-1.5 pl-2 bg-muted rounded-md text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate text-xs flex-1">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="flex flex-col gap-1 items-end">
                            <SignatureStatusBadge file={item} />
                            <ContentCheckBadge file={item} />
                        </div>
                        {'url' in item && item.url && (
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onPreview(item as { name: string, url: string })}>
                                <Eye className="h-4 w-4" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(indicatorId, docIndex, item)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
             {uploadingFiles.map(name => (
                <div key={name} className="flex items-center justify-between p-1.5 pl-2 bg-muted rounded-md text-sm opacity-70">
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                        <span className="truncate text-xs flex-1">{name}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const Criterion1IndicatorBlock = ({ indicator, criterion, assessmentData, onValueChange, onNoteChange, onEvidenceChange, onPreview, periodId, communeId }: {
    indicator: Indicator;
    criterion: Criterion;
    assessmentData: AssessmentValues;
    onValueChange: (id: string, value: any) => void;
    onNoteChange: (id: string, note: string) => void;
    onEvidenceChange: (id: string, files: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus) => void,
    onPreview: (file: { name: string, url: string }) => void;
    periodId: string;
    communeId: string;
}) => {
    const data = assessmentData[indicator.id];
    if (!data) return null;

    const assignedCount = criterion.assignedDocumentsCount || 0;
    const progress = assignedCount > 0 ? Math.round(((Number(data.value) || 0) / assignedCount) * 100) : 0;
    const isAchieved = progress >= 100;
    const progressColor = isAchieved ? "bg-green-500" : "bg-yellow-500";

    const blockClasses = cn(
        "grid gap-6 p-4 rounded-lg bg-card shadow-sm border transition-colors",
        data.status === 'achieved' && 'bg-green-50 border-green-200',
        data.status === 'not-achieved' && 'bg-red-50 border-red-200',
        data.status === 'pending' && 'bg-amber-50 border-amber-200'
    );

    const indicatorTitles = [
        "Tổng số VBQPPL đã ban hành:",
        "Tổng số dự thảo NQ của HĐND, QĐ của UBND được truyền thông:",
        "Tổng số NQ của HĐND, QĐ của UBND được thực hiện tự kiểm tra:"
    ];
    const indicatorIndex = criterion.indicators.findIndex(i => i.id === indicator.id);

    const handleUploadComplete = (indicatorId: string, docIndex: number, newFile: { name: string, url: string }) => {
        const currentFiles = assessmentData[indicatorId]?.filesPerDocument?.[docIndex] || [];
        onEvidenceChange(indicatorId, [...currentFiles, newFile], docIndex);
    };

    const handleRemoveFile = (indicatorId: string, docIndex: number, fileToRemove: FileWithStatus) => {
        onEvidenceChange(indicatorId, [], docIndex, fileToRemove);
    };

    return (
        <div className={blockClasses}>
            <div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={data.status} />
                    <h4 className="font-semibold text-base flex-1">{indicator.name}</h4>
                </div>
                <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md mt-3">
                    <div className="flex items-start gap-2 text-blue-800">
                        <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm">{indicator.description}</p>
                            <p className="text-sm mt-2"><strong>Yêu cầu đạt chuẩn: </strong><span className="font-semibold">{indicator.standardLevel}</span></p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                <div className="grid gap-2">
                    <div className="flex items-center gap-4">
                        <Label htmlFor={`${indicator.id}-input`} className="shrink-0">
                            {indicatorTitles[indicatorIndex] || 'Tổng số:'}
                        </Label>
                        <Input
                            id={`${indicator.id}-input`}
                            type="number"
                            placeholder="Số lượng"
                            className="w-28"
                            value={data.value || ''}
                            onChange={(e) => onValueChange(indicator.id, e.target.value)}
                        />
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <Label htmlFor={`progress-${indicator.id}`} className="text-xs font-normal">Tiến độ đạt chuẩn (so với {assignedCount} được giao)</Label>
                                <span className="text-xs font-semibold">{progress.toFixed(0)}%</span>
                            </div>
                            <Progress id={`progress-${indicator.id}`} value={progress} indicatorClassName={progressColor} className="h-2" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-2">
                <Label className="font-medium">Hồ sơ minh chứng (tương ứng với {(criterion.documents || []).length} văn bản được giao)</Label>
                {indicatorIndex === 0 && (
                    <Alert variant="destructive" className="border-amber-500 text-amber-900 bg-amber-50 [&>svg]:text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="font-semibold text-amber-800">Lưu ý quan trọng</AlertTitle>
                        <AlertDescription>
                            Các tệp PDF được tải lên sẽ được hệ thống tự động kiểm tra chữ ký số và ngày ký để đối chiếu với thời hạn ban hành.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                    {(criterion.documents || []).map((doc, i) => (
                        <div key={i} className="p-3 border rounded-lg grid gap-2 bg-background">
                            <Label className="font-medium text-center text-sm">
                                Minh chứng cho VB: <span className="font-bold text-primary">{doc.name}</span>
                            </Label>
                            <Criterion1EvidenceUploader
                                indicatorId={indicator.id}
                                docIndex={i}
                                evidence={data.filesPerDocument?.[i] || []}
                                onUploadComplete={handleUploadComplete}
                                onRemove={handleRemoveFile}
                                onPreview={onPreview}
                                periodId={periodId}
                                communeId={communeId}
                            />
                        </div>
                    ))}
                </div>
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
    );
};


const Criterion1Assessment = ({ criterion, assessmentData, onValueChange, onNoteChange, onEvidenceChange, onIsTaskedChange, onPreview, periodId, communeId, handleSaveDraft }: {
    criterion: Criterion;
    assessmentData: AssessmentValues;
    onValueChange: (id: string, value: any) => void;
    onNoteChange: (id: string, note: string) => void;
    onEvidenceChange: (id: string, files: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus) => void,
    onIsTaskedChange: (id: string, isTasked: boolean) => void;
    onPreview: (file: { name: string, url: string }) => void;
    periodId: string;
    communeId: string;
    handleSaveDraft: () => Promise<void>;
}) => {
    const firstIndicatorId = criterion.indicators[0]?.id;
    if (!firstIndicatorId || !assessmentData[firstIndicatorId]) return null;
    
    const isNotTasked = assessmentData[firstIndicatorId]?.isTasked === false;
    
    const handleNoTaskChange = (checked: boolean | 'indeterminate') => {
        const notTasked = checked === true;
        criterion.indicators.forEach(indicator => {
            onIsTaskedChange(indicator.id, !notTasked);
        });
    }

    const filesPerDocRef = React.useRef(assessmentData[firstIndicatorId]?.filesPerDocument);
    useEffect(() => {
        const firstIndicatorData = assessmentData[firstIndicatorId];
        if (firstIndicatorData && JSON.stringify(filesPerDocRef.current) !== JSON.stringify(firstIndicatorData.filesPerDocument)) {
            handleSaveDraft();
            filesPerDocRef.current = firstIndicatorData.filesPerDocument;
        }
    }, [assessmentData, handleSaveDraft, firstIndicatorId]);

    return (
        <div className="grid gap-6">
            <div className="flex items-center space-x-2">
                <Checkbox 
                    id={`${criterion.id}-notask`} 
                    checked={isNotTasked} 
                    onCheckedChange={handleNoTaskChange} 
                />
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
                            <CardTitle className="text-base text-primary flex items-center gap-2"><ListChecks /> Thông tin nhiệm vụ được giao từ Admin</CardTitle>
                             <CardDescription>Đây là danh sách các văn bản cụ thể bạn cần ban hành trong kỳ đánh giá này.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(criterion.documents || []).length > 0 ? (
                                criterion.documents?.map((doc, index) => (
                                    <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 p-3 border-l-4 border-blue-300 rounded bg-background text-sm">
                                        <div className="col-span-full font-semibold text-primary">Văn bản {index + 1}: {doc.name}</div>
                                        <div className="text-muted-foreground">Trích yếu:</div>
                                        <div className="col-span-2 font-medium">{doc.excerpt}</div>
                                        <div className="text-muted-foreground">Ngày ban hành (ấn định):</div>
                                        <div className="col-span-2 font-medium">{doc.issueDate}</div>
                                        <div className="text-muted-foreground">Thời hạn ban hành:</div>
                                        <div className="col-span-2 font-medium">
                                            <Badge variant="destructive">{doc.issuanceDeadlineDays} ngày</Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Không có văn bản nào được Admin định danh cụ thể.</p>
                            )}
                        </CardContent>
                    </Card>
                    
                    <div className="space-y-8">
                        {criterion.indicators.map((indicator, index) => (
                            <React.Fragment key={indicator.id}>
                                {index > 0 && <Separator className="my-6"/>}
                                <Criterion1IndicatorBlock 
                                    indicator={indicator}
                                    criterion={criterion}
                                    assessmentData={assessmentData}
                                    onValueChange={onValueChange}
                                    onNoteChange={onNoteChange}
                                    onEvidenceChange={onEvidenceChange}
                                    onPreview={onPreview}
                                    periodId={periodId}
                                    communeId={communeId}
                                />
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};



export default function SelfAssessmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { storage, currentUser, assessmentPeriods, criteria, assessments, updateAssessments } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewFile, setPreviewFile] = useState<{name: string, url: string} | null>(null);
  
  const initializeState = useCallback((criteria: Criterion[], existingData?: Record<string, IndicatorResult>): AssessmentValues => {
      const initialState: AssessmentValues = {};
      criteria.forEach(criterion => {
          (criterion.indicators || []).forEach(indicator => {
              const processIndicator = (sub: Indicator | SubIndicator) => {
                  const saved = existingData?.[sub.id];
                  initialState[sub.id] = { 
                      isTasked: saved?.isTasked ?? null, 
                      value: saved?.value ?? '', 
                      files: saved?.files ?? [], 
                      filesPerDocument: saved?.filesPerDocument ?? {},
                      note: saved?.note ?? '', 
                      status: saved?.status ?? 'pending',
                      adminNote: saved?.adminNote ?? '',
                      communeNote: saved?.communeNote ?? '',
                  };
              };
              processIndicator(indicator);
              
              if (indicator.subIndicators && indicator.subIndicators.length > 0) {
                  indicator.subIndicators.forEach(processIndicator);
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
        const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === indicatorId || (i.subIndicators && i.subIndicators.some(si => si.id === indicatorId))));
        const assignedCount = parentCriterion?.id === 'TC01' ? parentCriterion.assignedDocumentsCount : undefined;
        const filesPerDocument = parentCriterion?.id === 'TC01' ? assessmentData[indicatorId].filesPerDocument : undefined;
        
        const newStatus = evaluateStatus(valueToEvaluate, indicator.standardLevel, isTasked, assignedCount, filesPerDocument);
        setAssessmentData(prev => ({
            ...prev,
            [indicatorId]: {
                ...prev[indicatorId],
                isTasked: isTasked,
                status: newStatus,
                value: isTasked ? prev[indicatorId].value : null,
                files: isTasked ? prev[indicatorId].files : [],
                filesPerDocument: isTasked ? prev[indicatorId].filesPerDocument : {},
            }
        }));
    }
  }


  const handleValueChange = (indicatorId: string, value: any) => {
    const indicator = findIndicator(indicatorId);
    if (indicator) {
        const isTasked = assessmentData[indicatorId].isTasked;
        
        const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === indicatorId));
        const assignedCount = parentCriterion?.id === 'TC01' ? parentCriterion.assignedDocumentsCount : undefined;
        const filesPerDocument = parentCriterion?.id === 'TC01' ? assessmentData[indicatorId].filesPerDocument : undefined;
        
        let newStatus = evaluateStatus(value, indicator.standardLevel, isTasked, assignedCount, filesPerDocument);
        
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


  const handleEvidenceChange = (indicatorId: string, newFiles: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus) => {
      setAssessmentData(prev => {
        const newData = {...prev};
        const currentIndicatorData = newData[indicatorId];

        if (docIndex !== undefined) { 
            const newFilesPerDoc = {...currentIndicatorData.filesPerDocument};
            if(fileToRemove) {
                 newFilesPerDoc[docIndex] = (newFilesPerDoc[docIndex] || []).filter(f => f.name !== fileToRemove.name);
            } else {
                 newFilesPerDoc[docIndex] = [...(newFilesPerDoc[docIndex] || []), ...newFiles];
            }
            newData[indicatorId] = { ...currentIndicatorData, filesPerDocument: newFilesPerDoc };
        } else { 
            if (fileToRemove) {
                 newData[indicatorId] = { ...currentIndicatorData, files: currentIndicatorData.files.filter(f => f.name !== fileToRemove.name) };
            } else {
                newData[indicatorId] = { ...currentIndicatorData, files: [...currentIndicatorData.files, ...newFiles] };
            }
        }
        return newData;
    })
  }

  const uploadEvidenceFiles = async (periodId: string, communeId: string): Promise<Record<string, { files?: FileWithStatus[], filesPerDocument?: Record<number, FileWithStatus[]> }>> => {
    if (!storage) throw new Error("Firebase Storage is not initialized.");

    const uploadedFileUrls: Record<string, { files?: FileWithStatus[], filesPerDocument?: Record<number, FileWithStatus[]> }> = {};
    const allUploadPromises: Promise<void>[] = [];

    for (const indicatorId in assessmentData) {
        const indicatorData = assessmentData[indicatorId];
        const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === indicatorId || (i.subIndicators && i.subIndicators.some(si => si.id === indicatorId))));
        
        if (parentCriterion?.id === 'TC01') {
            uploadedFileUrls[indicatorId] = {
                files: indicatorData.files,
                filesPerDocument: indicatorData.filesPerDocument
            };
            continue;
        }
        
        uploadedFileUrls[indicatorId] = {};

        const localFiles = indicatorData.files.filter((f): f is File => f instanceof File);
        const existingFiles = indicatorData.files.filter((f): f is {name: string, url: string} => !(f instanceof File));
        uploadedFileUrls[indicatorId].files = existingFiles;
        
        localFiles.forEach(file => {
            const promise = async () => {
                const filePath = `hoso/${communeId}/evidence/${periodId}/${indicatorId}/${file.name}`;
                const storageRef = ref(storage, filePath);
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                if (!uploadedFileUrls[indicatorId].files) {
                    uploadedFileUrls[indicatorId].files = [];
                }
                uploadedFileUrls[indicatorId].files!.push({ name: file.name, url: downloadURL });
            };
            allUploadPromises.push(promise());
        });
    }

    await Promise.all(allUploadPromises);
    return uploadedFileUrls;
}


  const handleSaveDraft = useCallback(async () => {
    if (!activePeriod || !currentUser || !storage) {
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
        const fileUrlsByIndicator = await uploadEvidenceFiles(activePeriod.id, currentUser.communeId);
        
        const sanitizedData = sanitizeDataForFirestore(assessmentData);
        const assessmentDataForFirestore = Object.entries(sanitizedData).reduce((acc, [key, value]) => {
            acc[key] = {
                ...value,
                files: fileUrlsByIndicator[key]?.files || value.files,
                filesPerDocument: fileUrlsByIndicator[key]?.filesPerDocument || value.filesPerDocument,
            };
            return acc;
        }, {} as Record<string, IndicatorResult>);


        const updatedAssessment: Assessment = {
            ...currentAssessment,
            assessmentStatus: 'draft',
            assessmentData: assessmentDataForFirestore,
        };
        
        await updateAssessments(assessments.map(a => a.id === updatedAssessment.id ? updatedAssessment : a));

        toast({
          title: "Lưu nháp thành công!",
          description: "Bạn có thể tiếp tục chỉnh sửa sau.",
        });
    } catch (error) {
        console.error("Draft saving error:", error);
        toast({ variant: 'destructive', title: 'Lỗi khi lưu nháp', description: 'Đã xảy ra lỗi khi tải tệp hoặc lưu dữ liệu.' });
    } finally {
        setIsSubmitting(false);
    }
  }, [activePeriod, currentUser, storage, assessments, assessmentData, updateAssessments, toast]);

  const { canSubmit, submissionErrors } = useMemo(() => {
    const errors: string[] = [];
    let allIndicatorsAssessed = true;

    for (const id in assessmentData) {
        const data = assessmentData[id];
        const indicator = findIndicator(id);
        if (!indicator) continue;

        if (data.status === 'pending') {
            allIndicatorsAssessed = false;
        }

        if (data.status !== 'pending' && data.isTasked !== false) {
            const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === id || (i.subIndicators && i.subIndicators.some(si => si.id === id))));
            const isCriterion1 = parentCriterion?.id === 'TC01';

            if (isCriterion1) {
                 const assignedDocs = parentCriterion.documents || [];
                 if (assignedDocs.length > 0 && Number(data.value) > 0) { 
                     const docIndicesWithMissingFiles = assignedDocs.map((_,i) => i).filter(i => (data.filesPerDocument?.[i] || []).length === 0);
                     if (docIndicesWithMissingFiles.length > 0) {
                         errors.push(`Chỉ tiêu "${indicator.name}" yêu cầu minh chứng cho mỗi văn bản được giao.`);
                     }
                 }
            } else {
                if (data.files.length === 0) {
                    errors.push(`Chỉ tiêu "${indicator.name}" yêu cầu minh chứng.`);
                }
            }
        }
    }

    if (!allIndicatorsAssessed) {
        errors.push("Bạn phải hoàn thành việc chấm điểm cho tất cả các chỉ tiêu.");
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
        await handleSaveDraft(); // Save first to ensure all files are uploaded and data is consistent
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
  
  const calculateCriterionStatus = (criterion: Criterion): AssessmentStatus => {
    let hasPending = false;
    for (const indicator of criterion.indicators) {
        if (indicator.subIndicators && indicator.subIndicators.length > 0) {
            for (const sub of indicator.subIndicators) {
                const status = assessmentData[sub.id]?.status;
                if (status === 'not-achieved') return 'not-achieved';
                if (status === 'pending') hasPending = true;
            }
        } else {
            const status = assessmentData[indicator.id]?.status;
            if (status === 'not-achieved') return 'not-achieved';
            if (status === 'pending') hasPending = true;
        }
    }
    return hasPending ? 'pending' : 'achieved';
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
                                                    onPreview={setPreviewFile}
                                                    periodId={activePeriod.id}
                                                    communeId={currentUser.communeId}
                                                    handleSaveDraft={handleSaveDraft}
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

                                                return (
                                                    <div key={indicator.id}>
                                                        {(!indicator.subIndicators || indicator.subIndicators.length === 0) ? (
                                                            <div className={indicatorBlockClasses}>
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
                                                                    onPreview={setPreviewFile}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className={indicatorBlockClasses}>
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
                                                                        if (!assessmentData[sub.id]) return null;
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
                                                                                  onPreview={setPreviewFile}
                                                                              />
                                                                          </div>
                                                                        )
                                                                  })}
                                                                </div>
                                                            </div>
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
                 <Button variant="secondary" onClick={() => window.open(previewFile?.url, '_blank')}><Download className="mr-2 h-4 w-4"/> Tải xuống</Button>
                <Button variant="outline" onClick={() => setPreviewFile(null)}>Đóng</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
