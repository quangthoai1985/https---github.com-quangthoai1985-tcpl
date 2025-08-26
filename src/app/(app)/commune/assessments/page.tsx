
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
import { cn } from "@/lib/utils";

type AssessmentStatus = 'achieved' | 'not-achieved' | 'pending';
type AssessmentValues = Record<string, { value: any; files: File[], note: string, status: AssessmentStatus }>;


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

const renderInput = (indicator: Indicator | SubIndicator, value: any, onValueChange: (id: string, value: any) => void) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onValueChange(indicator.id, e.target.value);
    }
    
    const handleRadioChange = (val: string) => {
        onValueChange(indicator.id, val === 'true');
    }

    switch (indicator.inputType) {
        case 'boolean':
            return (
                <RadioGroup onValueChange={handleRadioChange} value={value === true ? 'true' : value === false ? 'false' : ''}>
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
                    <Input id={`${indicator.id}-input`} type="number" placeholder="Nhập giá trị" value={value || ''} onChange={handleChange} />
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
                    <Input id={`${indicator.id}-input`} type="text" placeholder="Nhập kết quả" value={value || ''} onChange={handleChange} />
                </div>
            );
    }
}

const evaluateStatus = (value: any, standardLevel: string): AssessmentStatus => {
    if (value === undefined || value === null || value === '') return 'pending';

    const standard = standardLevel.toLowerCase();

    // Handle boolean inputs
    if (typeof value === 'boolean') {
        const required = standard === 'đạt' || standard === 'true';
        return value === required ? 'achieved' : 'not-achieved';
    }

    // Handle number inputs (e.g., '>=85', '>=85%', '100%')
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
    
    // Handle text inputs
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


const IndicatorAssessment = ({ indicator, data, onValueChange, onFileChange }: { 
    indicator: Indicator | SubIndicator,
    data: AssessmentValues[string],
    onValueChange: (id: string, value: any) => void,
    onFileChange: (id: string, files: File[]) => void
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
        
        <div className="grid gap-2">
            <Label>Kết quả tự đánh giá</Label>
            {renderInput(indicator, data.value, onValueChange)}
        </div>

        <div className="grid gap-2">
            <p className="text-sm"><strong>Yêu cầu hồ sơ minh chứng:</strong> {indicator.evidenceRequirement}</p>
            <FileUploadComponent indicatorId={indicator.id} files={data.files} onFileChange={onFileChange} />
        </div>
    </div>
);


const initializeState = (criteria: Criterion[]): AssessmentValues => {
    const initialState: AssessmentValues = {};
    criteria.forEach(criterion => {
        criterion.indicators.forEach(indicator => {
            if (indicator.subIndicators && indicator.subIndicators.length > 0) {
                indicator.subIndicators.forEach(sub => {
                    initialState[sub.id] = { value: '', files: [], note: '', status: 'pending' };
                });
            } else {
                initialState[indicator.id] = { value: '', files: [], note: '', status: 'pending' };
            }
        });
    });
    return initialState;
};

export default function SelfAssessmentPage() {
  const { toast } = useToast();
  const { assessmentPeriods, criteria } = useData();
  const activePeriod = assessmentPeriods.find(p => p.isActive);
  const [assessmentData, setAssessmentData] = useState<AssessmentValues>(() => initializeState(criteria));

  const handleValueChange = (indicatorId: string, value: any) => {
    let indicator: Indicator | SubIndicator | undefined;
    for (const c of criteria) {
        for (const i of c.indicators) {
            if (i.id === indicatorId) {
                indicator = i;
                break;
            }
            if (i.subIndicators) {
                const sub = i.subIndicators.find(si => si.id === indicatorId);
                if (sub) {
                    indicator = sub;
                    break;
                }
            }
        }
        if (indicator) break;
    }

    if (indicator) {
        const newStatus = evaluateStatus(value, indicator.standardLevel);
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
                                                        indicator={indicator} 
                                                        data={assessmentData[indicator.id]} 
                                                        onValueChange={handleValueChange}
                                                        onFileChange={handleFileChange}
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
                                                                      indicator={sub} 
                                                                      data={assessmentData[sub.id]}
                                                                      onValueChange={handleValueChange}
                                                                      onFileChange={handleFileChange}
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
