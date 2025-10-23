'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Info } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EvidenceUploaderComponent from './EvidenceUploaderComponent';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import type { Content, Criterion, Indicator, SubIndicator } from '@/lib/data';
import type { AssessmentValues, FileWithStatus, IndicatorValue } from './types';

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

    if (Array.isArray(specialIndicatorIds) && specialIndicatorIds.includes(indicator.id)) {
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

const IndicatorAssessment = ({ specialIndicatorIds, specialLabels, customBooleanLabels, checkboxOptions, indicator, data, onValueChange, onNoteChange, onEvidenceChange, onIsTaskedChange, onPreview, criteria, assessmentData, contentId, parentIndicatorId }: {
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
    parentIndicatorId?: string,
}) => {
    
    const targetIndicatorId = parentIndicatorId || indicator.id;
    const targetContentId = contentId || indicator.id;

    const displayData = data;

    const isEvidenceRequired = displayData.status !== 'pending' && (parentIndicatorId ? true : data.isTasked !== false) && (displayData.files || []).length === 0;

    return (
        <div className="grid gap-6">
            <div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={displayData.status} />
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
                  {renderInput(indicator, specialIndicatorIds, specialLabels, customBooleanLabels, checkboxOptions, displayData, onValueChange, onIsTaskedChange, criteria, assessmentData, contentId)}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor={`note-${indicator.id}-${contentId}`}>Ghi chú/Giải trình</Label>
                    <Textarea
                        id={`note-${indicator.id}-${contentId}`}
                        placeholder="Giải trình thêm về kết quả hoặc các vấn đề liên quan..."
                        value={displayData.note || ''}
                        onChange={(e) => onNoteChange(targetIndicatorId, e.target.value, contentId)}
                    />
                </div>
            </div>

            <div className="grid gap-2">
                <Label className="font-medium">Hồ sơ minh chứng</Label>
                <p className="text-sm text-muted-foreground">{indicator.evidenceRequirement || 'Không yêu cầu cụ thể.'}</p>
                <div className="mt-2">
                    <EvidenceUploaderComponent indicatorId={targetIndicatorId} parentIndicatorId={parentIndicatorId} contentId={contentId} evidence={displayData.files || []} onEvidenceChange={onEvidenceChange} onPreview={onPreview} isRequired={isEvidenceRequired} />
                </div>
            </div>
        </div>
    )
};

export default IndicatorAssessment;

    

    
