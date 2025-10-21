
'use client';

import React from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CornerDownRight, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Assessment, Criterion, Indicator, IndicatorResult } from "@/lib/data";
import type { AssessmentStatus, AssessmentValues, FileWithStatus } from './types';
import StatusBadge from './StatusBadge';
import IndicatorAssessment from './IndicatorAssessment';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CT4EvidenceUploader from './CT4EvidenceUploader';
import EvidenceUploaderComponent from './EvidenceUploaderComponent';

const GenericCriterionComponent = ({
    criterion,
    criterionStatus,
    assessmentData,
    onValueChange,
    onNoteChange,
    onEvidenceChange,
    onIsTaskedChange,
    onPreview,
    criteria,
    specialLogicIndicatorIds,
    getSpecialIndicatorLabels,
    getCustomBooleanLabels,
    getCheckboxOptions,
    periodId,
    communeId,
    handleCommuneDocsChange,
    ...props // Pass down the rest of the props for IndicatorAssessment
}: {
    criterion: Criterion;
    criterionStatus: AssessmentStatus;
    assessmentData: AssessmentValues;
    onValueChange: (id: string, value: any, contentId?: string) => void;
    onNoteChange: (id: string, note: string, contentId?: string) => void;
    onEvidenceChange: (id: string, files: any[], docIndex?: number, fileToRemove?: any, contentId?: string) => void;
    onIsTaskedChange: (id: string, isTasked: boolean) => void;
    onPreview: (file: { name: string; url: string; }) => void;
    criteria: Criterion[];
    specialLogicIndicatorIds: string[];
    getSpecialIndicatorLabels: (indicatorId: string, criteria: Criterion[]) => { no: string; yes: string; };
    getCustomBooleanLabels: (indicatorId: string, criteria: Criterion[]) => { true: string, false: string } | null;
    getCheckboxOptions: (indicatorId: string, criteria: Criterion[]) => string[] | null;
    periodId: string;
    communeId: string;
    handleCommuneDocsChange: (indicatorId: string, docs: any[]) => void;
}) => {
    
    const triggerClasses = cn(
        "font-headline text-lg rounded-md px-4 transition-colors hover:no-underline",
        criterionStatus === 'achieved' && 'bg-green-100 hover:bg-green-200/80',
        criterionStatus === 'not-achieved' && 'bg-red-100 hover:bg-red-200/80',
        criterionStatus === 'pending' && 'bg-amber-100 hover:bg-amber-200/80',
    );
    const index = criteria.findIndex(c => c.id === criterion.id);

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
                        
                        const hasContents = indicator.contents && indicator.contents.length > 0;

                        return (
                            <div key={indicator.id} className={indicatorBlockClasses}>
                                {hasContents ? (
                                     <>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={assessmentData[indicator.id]?.status} />
                                            <h4 className="font-semibold text-base flex-1">{indicator.name}</h4>
                                        </div>
                                        <div className="mt-4 pl-6 space-y-6 border-l-2 border-dashed">
                                          {(indicator.contents || []).map(content => {
                                                const contentData = assessmentData[indicator.id]?.contentResults?.[content.id];
                                                if (!contentData) return <div key={content.id}>Đang tải nội dung {content.name}...</div>;

                                                const subBlockClasses = cn(
                                                    "relative pl-6 transition-colors rounded-r-lg py-4 border-l-2 border-dashed mt-6", // Thêm mt-6
                                                     contentData.status === 'achieved' && 'bg-green-50',
                                                     contentData.status === 'not-achieved' && 'bg-red-50',
                                                     contentData.status === 'pending' && 'bg-amber-50 border-l-amber-200'
                                                );

                                                // ================ LOGIC PHÂN LOẠI CONTENT ================
                                                if (content.id === 'CNT033278') { 
                                                    // ----- RENDER NỘI DUNG 1 (Giống TC1) -----
                                                    const parentIndicatorData = assessmentData[indicator.id];
                                                    const assignmentType = indicator.assignmentType || 'specific';
                                                    const communeDefinedDocs = parentIndicatorData.communeDefinedDocuments || [];
                                                    const docsToRender = assignmentType === 'specific' ? (indicator.documents || []) : communeDefinedDocs;
                                                    
                                                    const handleContent1EvidenceChange = (files: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus) => {
                                                        onEvidenceChange(indicator.id, files, docIndex, fileToRemove, content.id);
                                                    };

                                                    return (
                                                        <div key={content.id} className={subBlockClasses}>
                                                            <CornerDownRight className="absolute -left-3 top-5 h-5 w-5 text-muted-foreground"/>
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <StatusBadge status={contentData.status} />
                                                                <h5 className="font-semibold text-base flex-1">{content.name}</h5>
                                                            </div>
                                                             <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md">
                                                                <div className="flex items-start gap-2 text-blue-800">
                                                                   <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                                                                   <p className="text-sm">{content.description}</p>
                                                                </div>
                                                             </div>
                                                             <div className="grid gap-2 mt-4">
                                                                <div className="grid gap-2 p-3 border rounded-md bg-background">
                                                                    <Label htmlFor={`provincialPlanDate-${content.id}`} className="font-medium text-destructive">
                                                                        Khai báo Ngày ban hành Kế hoạch của Tỉnh
                                                                    </Label>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Nhập ngày ban hành (theo định dạng DD/MM/YYYY) của văn bản cấp Tỉnh. 
                                                                        Đây là căn cứ để hệ thống tính 7 ngày làm việc.
                                                                    </p>
                                                                    <Input 
                                                                        id={`provincialPlanDate-${content.id}`}
                                                                        placeholder="DD/MM/YYYY" 
                                                                        className="w-48"
                                                                        value={(contentData.value && typeof contentData.value === 'object' && contentData.value.provincialPlanDate) || ''}
                                                                        onChange={(e) => {
                                                                             const newValue = { ...((contentData.value && typeof contentData.value === 'object') ? contentData.value : {}), provincialPlanDate: e.target.value };
                                                                            onValueChange(indicator.id, newValue, content.id);
                                                                        }}
                                                                    />
                                                                </div>
                                                                {docsToRender.length > 0 ? (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                                                                        {docsToRender.map((doc, docIndex) => {
                                                                            const evidence = contentData.filesPerDocument?.[docIndex] || [];
                                                                            const isRequired = contentData.status !== 'pending' && evidence.length === 0;

                                                                            return (
                                                                                <div key={docIndex} className="p-3 border rounded-lg grid gap-2 bg-background">
                                                                                    <Label className="font-medium text-center text-sm truncate">Minh chứng cho: <span className="font-bold text-primary">{doc.name || `Văn bản ${docIndex + 1}`}</span></Label>
                                                                                    <CT4EvidenceUploader 
                                                                                        indicatorId={indicator.id}
                                                                                        contentId={content.id}
                                                                                        docIndex={docIndex}
                                                                                        evidence={evidence} 
                                                                                        onEvidenceChange={handleContent1EvidenceChange}
                                                                                        onPreview={onPreview} 
                                                                                        periodId={periodId} 
                                                                                        communeId={communeId} 
                                                                                        isRequired={isRequired}
                                                                                        accept=".pdf"
                                                                                    />
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                ) : null }
                                                             </div>
                                                              <div className="grid gap-2 mt-4">
                                                                <Label htmlFor={`note-${indicator.id}-${content.id}`}>Ghi chú/Giải trình</Label>
                                                                <textarea id={`note-${indicator.id}-${content.id}`} placeholder="Giải trình thêm..." value={contentData.note || ''} onChange={(e) => onNoteChange(indicator.id, e.target.value, content.id)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"/>
                                                              </div>
                                                        </div>
                                                    );
                                                } else if (content.id === 'CNT066117') {
                                                    // ----- RENDER NỘI DUNG 2 (Tỷ lệ %) -----
                                                    const valueObj = (typeof contentData.value === 'object' && contentData.value !== null) ? contentData.value : { total: '', completed: '' };
                                                    const total = Number(valueObj.total || 0);
                                                    const completed = Number(valueObj.completed || 0);
                                                    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

                                                    return (
                                                        <div key={content.id} className={subBlockClasses}>
                                                            <CornerDownRight className="absolute -left-3 top-5 h-5 w-5 text-muted-foreground"/>
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <StatusBadge status={contentData.status} />
                                                                <h5 className="font-semibold text-base flex-1">{content.name}</h5>
                                                            </div>
                                                             <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md">
                                                                <div className="flex items-start gap-2 text-blue-800">
                                                                   <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                                                                   <p className="text-sm">{content.description}</p>
                                                                </div>
                                                             </div>
                                                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 items-end">
                                                                <div className="grid gap-1.5">
                                                                   <Label htmlFor={`ct4-total-${content.id}`}>Tổng số nhiệm vụ đề ra</Label>
                                                                   <Input id={`ct4-total-${content.id}`} type="number" placeholder="VD: 10" value={valueObj.total} 
                                                                          onChange={(e) => onValueChange(indicator.id, {...valueObj, total: e.target.value}, content.id)} />
                                                                </div>
                                                                 <div className="grid gap-1.5">
                                                                   <Label htmlFor={`ct4-completed-${content.id}`}>Số nhiệm vụ hoàn thành</Label>
                                                                   <Input id={`ct4-completed-${content.id}`} type="number" placeholder="VD: 8" value={valueObj.completed} 
                                                                          onChange={(e) => onValueChange(indicator.id, {...valueObj, completed: e.target.value}, content.id)} />
                                                                </div>
                                                                 <div className="text-center md:text-left">
                                                                   <Label className="text-xs font-normal">Tỷ lệ hoàn thành</Label>
                                                                   <p className="text-2xl font-bold">{percentage}%</p>
                                                                 </div>
                                                             </div>
                                                             <div className="grid gap-2 mt-4">
                                                                <Label className="font-medium">Hồ sơ minh chứng</Label>
                                                                 <EvidenceUploaderComponent 
                                                                    indicatorId={indicator.id} 
                                                                    contentId={content.id} 
                                                                    evidence={contentData.files || []} 
                                                                    onEvidenceChange={onEvidenceChange} 
                                                                    onPreview={onPreview} 
                                                                    isRequired={contentData.status === 'not-achieved' && contentData.files.length === 0}
                                                                    parentIndicatorId={indicator.id}
                                                                  />
                                                             </div>
                                                             <div className="grid gap-2 mt-4">
                                                                <Label htmlFor={`note-${indicator.id}-${content.id}`}>Ghi chú/Giải trình</Label>
                                                                <textarea id={`note-${indicator.id}-${content.id}`} placeholder="Giải trình thêm..." value={contentData.note || ''} onChange={(e) => onNoteChange(indicator.id, e.target.value, content.id)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"/>
                                                              </div>
                                                        </div>
                                                    );
                                                } else {
                                                    // ----- RENDER CONTENT THÔNG THƯỜNG (Fallback) -----
                                                     return (
                                                         <div key={content.id} className={subBlockClasses}>
                                                            <CornerDownRight className="absolute -left-3 top-5 h-5 w-5 text-muted-foreground"/>
                                                            <IndicatorAssessment
                                                               {...props} // Truyền tất cả props xuống
                                                               indicator={content} // indicator giờ là content
                                                               data={contentData} // data của content
                                                               onValueChange={(id, value, cId) => onValueChange(indicator.id, value, cId)}
                                                               onNoteChange={(id, note, cId) => onNoteChange(indicator.id, note, cId)}
                                                               onEvidenceChange={(id, files, docIdx, fileToDel, cId) => onEvidenceChange(indicator.id, files, docIdx, fileToDel, cId)}
                                                               contentId={content.id}
                                                               parentIndicatorId={indicator.id}
                                                            />
                                                         </div>
                                                    );
                                                }
                                                // ================ KẾT THÚC LOGIC PHÂN LOẠI ================
                                          })}
                                        </div>
                                    </>
                                ) : (
                                    <IndicatorAssessment
                                        specialIndicatorIds={specialLogicIndicatorIds}
                                        specialLabels={getSpecialIndicatorLabels(indicator.id, criteria)}
                                        customBooleanLabels={getCustomBooleanLabels(indicator.id, criteria)}
                                        checkboxOptions={getCheckboxOptions(indicator.id, criteria)}
                                        indicator={indicator as any}
                                        data={assessmentData[indicator.id]}
                                        onValueChange={onValueChange}
                                        onNoteChange={onNoteChange}
                                        onEvidenceChange={onEvidenceChange}
                                        onIsTaskedChange={onIsTaskedChange}
                                        onPreview={onPreview}
                                        criteria={criteria}
                                        assessmentData={assessmentData}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
};

export default GenericCriterionComponent;
