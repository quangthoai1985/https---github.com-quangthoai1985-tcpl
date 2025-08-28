
'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, File as FileIcon, X, CornerDownRight, CheckCircle, XCircle, CircleSlash } from "lucide-react";
import React, { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/context/DataContext";
import PageHeader from "@/components/layout/page-header";
import type { Indicator, SubIndicator, Criterion } from "@/lib/data";
import { Textarea } from "@/components/ui/textarea";

type AssessmentStatus = 'achieved' | 'not-achieved' | 'pending';
// Updated value structure to handle the new logic for TC1
type IndicatorValue = {
    isTasked?: boolean; // For TC1: true if "Được giao nhiệm vụ", false if "Không được giao nhiệm vụ"
    value: any; // The actual value (percentage, boolean, text, etc.)
    files: File[];
    note: string;
    status: AssessmentStatus;
};
type AssessmentValues = Record<string, IndicatorValue>;


function FileUploadComponent({ indicatorId, files, onFileChange }: { indicatorId: string; files: File[]; onFileChange: (id: string, files: File[]) => void; }) {
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFileChange(indicatorId, Array.from(e.target.files || []));
    };
    
    const handleFileRemove = (fileToRemove: File) => {
        onFileChange(indicatorId, files.filter(f => f !== fileToRemove));
    };

    return (
        <div className="grid gap-2">
            <Label>Hồ sơ minh chứng</Label>
            <div className="w-full relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                    Kéo và thả tệp vào đây, hoặc <span className="font-semibold text-primary">nhấn để chọn tệp</span>
                </p>
                <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple onChange={handleFileSelect} />
            </div>
            {files.length > 0 && (
                 <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium">Tệp đã tải lên:</p>
                    {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                            <div className="flex items-center gap-2 truncate">
                                <FileIcon className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{file.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFileRemove(file)}>
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
    if (criteria.length < 2) return [];
    
    // All indicators from the first criterion
    const firstCriterionIndicatorIds = criteria[0].indicators.flatMap(i => 
        i.subIndicators && i.subIndicators.length > 0 ? i.subIndicators.map(si => si.id) : [i.id]
    );

    const secondCriterion = criteria[1];
    let specialIdsFromSecondCriterion: string[] = [];

    // Indicator 2.2
    if (secondCriterion.indicators.length >= 2) {
        specialIdsFromSecondCriterion.push(secondCriterion.indicators[1].id);
    }
    
    // Indicator 2.3
    if (secondCriterion.indicators.length >= 3) {
        specialIdsFromSecondCriterion.push(secondCriterion.indicators[2].id);
    }

    return [...firstCriterionIndicatorIds, ...specialIdsFromSecondCriterion];
}

const getSpecialIndicatorLabels = (indicatorId: string, criteria: Criterion[]) => {
    if (criteria.length < 2) return { no: 'Không được giao nhiệm vụ', yes: 'Được giao nhiệm vụ' };
    
    const indicator3_tc2_id = criteria[1].indicators.length >= 3 ? criteria[1].indicators[2].id : null;

    if (indicatorId === indicator3_tc2_id) {
        return { no: "Không yêu cầu cung cấp", yes: "Có yêu cầu cung cấp" };
    }

    return { no: 'Không được giao nhiệm vụ', yes: 'Được giao nhiệm vụ' };
}


// Updated to pass the full data object for conditional rendering
const renderInput = (
    indicator: Indicator | SubIndicator,
    specialIndicatorIds: string[], // Pass the list of special IDs
    specialLabels: { no: string; yes: string },
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
        case 'boolean':
            return (
                <RadioGroup onValueChange={handleRadioChange} value={data.value === true ? 'true' : data.value === false ? 'false' : ''} className="grid gap-2">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id={`${indicator.id}-true`} />
                        <Label htmlFor={`${indicator.id}-true`}>Đạt</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id={`${indicator.id}-false`} />
                        <Label htmlFor={`${indicator.id}-false`}>Không đạt</Label>
                    </div>
                </RadioGroup>
            );
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
        case 'text':
        default:
             return (
                <div className="grid gap-2">
                    <Label htmlFor={`${indicator.id}-input`}>Kết quả</Label>
                    <Input id={`${indicator.id}-input`} type="text" placeholder="Nhập kết quả" value={data.value || ''} onChange={handleChange} />
                </div>
            );
    }
}

const evaluateStatus = (value: any, standardLevel: string, isTasked?: boolean): AssessmentStatus => {
    // If not tasked/required, it's automatically achieved.
    if (isTasked === false) {
        return 'achieved';
    }

    if (value === undefined || value === null || value === '') return 'pending';

    const standard = standardLevel.toLowerCase();

    if (typeof value === 'boolean') {
        const required = standard === 'đạt' || standard === 'true';
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

const StatusIcon = ({ status }: { status: AssessmentStatus }) => {
    switch (status) {
        case 'achieved':
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'not-achieved':
            return <XCircle className="h-5 w-5 text-red-500" />;
        case 'pending':
        default:
            return <CircleSlash className="h-5 w-5 text-muted-foreground" />;
    }
};


const IndicatorAssessment = ({ specialIndicatorIds, specialLabels, indicator, data, onValueChange, onNoteChange, onFileChange, onIsTaskedChange }: { 
    specialIndicatorIds: string[],
    specialLabels: { no: string; yes: string },
    indicator: Indicator | SubIndicator,
    data: AssessmentValues[string],
    onValueChange: (id: string, value: any) => void,
    onNoteChange: (id: string, note: string) => void,
    onFileChange: (id: string, files: File[]) => void,
    onIsTaskedChange: (id: string, isTasked: boolean) => void,
}) => (
    <div className="grid gap-6">
        <div>
            <div className="flex items-center gap-2">
                <StatusIcon status={data.status} />
                <h4 className="font-semibold text-base flex-1">{indicator.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground mt-1 pl-7">{indicator.description}</p>
            <p className="text-sm mt-2 pl-7"><strong>Yêu cầu đạt chuẩn:</strong> <span className="font-semibold text-primary">{indicator.standardLevel}</span></p>
        </div>
        
        <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Kết quả tự đánh giá</Label>
              {renderInput(indicator, specialIndicatorIds, specialLabels, data, onValueChange, onIsTaskedChange)}
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
            <p className="text-sm"><strong>Yêu cầu hồ sơ minh chứng:</strong> {indicator.evidenceRequirement || 'Không yêu cầu'}</p>
            <FileUploadComponent indicatorId={indicator.id} files={data.files} onFileChange={onFileChange} />
        </div>
    </div>
);

export default function SelfAssessmentPage() {
  const { toast } = useToast();
  const { assessmentPeriods, criteria } = useData();
  
  const initializeState = (criteria: Criterion[]): AssessmentValues => {
      const initialState: AssessmentValues = {};
      criteria.forEach(criterion => {
          criterion.indicators.forEach(indicator => {
              if (indicator.subIndicators && indicator.subIndicators.length > 0) {
                  indicator.subIndicators.forEach(sub => {
                      initialState[sub.id] = { isTasked: undefined, value: '', files: [], note: '', status: 'pending' };
                  });
              } else {
                  initialState[indicator.id] = { isTasked: undefined, value: '', files: [], note: '', status: 'pending' };
              }
          });
      });
      return initialState;
  };

  const activePeriod = assessmentPeriods.find(p => p.isActive);
  const [assessmentData, setAssessmentData] = useState<AssessmentValues>(() => initializeState(criteria));
  
  const specialLogicIndicatorIds = React.useMemo(() => getSpecialLogicIndicatorIds(criteria), [criteria]);

  const findIndicator = (indicatorId: string) => {
    for (const c of criteria) {
        for (const i of c.indicators) {
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
                status: newStatus
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


  const handleFileChange = (indicatorId: string, files: File[]) => {
      setAssessmentData(prev => ({
          ...prev,
          [indicatorId]: {
              ...prev[indicatorId],
              files: files
          }
      }))
  }

  const handleSaveDraft = () => {
    console.log("Saving Draft: ", assessmentData);
    toast({
      title: "Lưu nháp thành công!",
      description: "Bạn có thể tiếp tục chỉnh sửa sau. Trạng thái hồ sơ: draft.",
    });
  };

  const handleSubmit = () => {
    console.log("Submitting: ", assessmentData);
    toast({
      title: "Gửi đánh giá thành công!",
      description: "Hồ sơ của bạn đã được gửi đến Admin để xem xét. Trạng thái hồ sơ: pending_review.",
    });
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
                                        {criterion.indicators.map(indicator => (
                                            <div key={indicator.id} className="grid gap-6 p-4 rounded-lg bg-card shadow-sm border">
                                                {(!indicator.subIndicators || indicator.subIndicators.length === 0) ? (
                                                    <IndicatorAssessment 
                                                        specialIndicatorIds={specialLogicIndicatorIds}
                                                        specialLabels={getSpecialIndicatorLabels(indicator.id, criteria)}
                                                        indicator={indicator} 
                                                        data={assessmentData[indicator.id]} 
                                                        onValueChange={handleValueChange}
                                                        onNoteChange={handleNoteChange}
                                                        onFileChange={handleFileChange}
                                                        onIsTaskedChange={handleIsTaskedChange}
                                                    />
                                                ) : (
                                                    <>
                                                        <div>
                                                          <h4 className="font-semibold text-base">{indicator.name}</h4>
                                                          <p className="text-sm text-muted-foreground mt-1">{indicator.description}</p>
                                                        </div>
                                                        <div className="mt-4 pl-6 space-y-6 border-l-2 border-dashed">
                                                          {(indicator.subIndicators || []).map(sub => (
                                                              <div key={sub.id} className="relative pl-6">
                                                                  <CornerDownRight className="absolute -left-3 top-1 h-5 w-5 text-muted-foreground"/>
                                                                  <IndicatorAssessment
                                                                      specialIndicatorIds={specialLogicIndicatorIds}
                                                                      specialLabels={getSpecialIndicatorLabels(sub.id, criteria)}
                                                                      indicator={sub} 
                                                                      data={assessmentData[sub.id]}
                                                                      onValueChange={handleValueChange}
                                                                      onNoteChange={handleNoteChange}
                                                                      onFileChange={handleFileChange}
                                                                      onIsTaskedChange={handleIsTaskedChange}
                                                                  />
                                                              </div>
                                                          ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleSaveDraft}>Lưu nháp</Button>
                    <Button onClick={handleSubmit}>Gửi đánh giá</Button>
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
