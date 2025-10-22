

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from "@/lib/utils";
import type { Assessment, AssessmentValues, FileWithStatus } from "./types";
import type { Criterion, Indicator } from "@/lib/data";
import { Info, AlertTriangle, CornerDownRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import StatusBadge from "./StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import EvidenceUploaderComponent from './EvidenceUploaderComponent';
import CT4EvidenceUploader from "./CT4EvidenceUploader";
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import IndicatorAssessment from './IndicatorAssessment';
import Criterion1Component from './Criterion1Component';
import Criterion4SpecialComponent from './Criterion4SpecialComponent';


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
    handleIsTaskedChange,
    updateSingleAssessment, // THÊM PROP NÀY
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
    handleIsTaskedChange: (id: string, isTasked: boolean) => void;
    updateSingleAssessment: (assessment: Partial<Assessment>) => Promise<void>; // THÊM PROP NÀY
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

                        // LOGIC MỚI: Xử lý riêng cho Chỉ tiêu 4
                        if (indicator.id === 'CT033278') {
                            return (
                                <Criterion4SpecialComponent
                                    key={indicator.id}
                                    indicator={indicator}
                                    assessmentData={assessmentData}
                                    onValueChange={onValueChange}
                                    onNoteChange={onNoteChange}
                                    onEvidenceChange={onEvidenceChange}
                                    onIsTaskedChange={onIsTaskedChange}
                                    onPreview={onPreview}
                                    periodId={periodId}
                                    communeId={communeId}
                                    handleCommuneDocsChange={handleCommuneDocsChange}
                                />
                            )
                        }

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

                                                return (
                                                    <div key={content.id} className={subBlockClasses}>
                                                        <CornerDownRight className="absolute -left-3 top-5 h-5 w-5 text-muted-foreground"/>
                                                        <IndicatorAssessment
                                                            specialIndicatorIds={specialLogicIndicatorIds}
                                                            specialLabels={getSpecialIndicatorLabels(content.id, criteria)}
                                                            customBooleanLabels={getCustomBooleanLabels(content.id, criteria)}
                                                            checkboxOptions={getCheckboxOptions(content.id, criteria)}
                                                            indicator={content} // indicator giờ là content
                                                            data={contentData} // data của content
                                                            onValueChange={(id, value, cId) => onValueChange(indicator.id, value, content.id)}
                                                            onNoteChange={(id, note, cId) => onNoteChange(indicator.id, note, content.id)}
                                                            onEvidenceChange={(id, files, docIdx, fileToDel, cId) => onEvidenceChange(indicator.id, files, docIdx, fileToDel, content.id)}
                                                            onIsTaskedChange={(id, isTasked) => handleIsTaskedChange(content.id, isTasked)} // Gọi handleIsTaskedChange với ID content
                                                            onPreview={onPreview}
                                                            criteria={criteria}
                                                            assessmentData={assessmentData} // assessmentData đầy đủ
                                                            contentId={content.id} // ID của content này
                                                            parentIndicatorId={indicator.id} // ID của chỉ tiêu cha
                                                        />
                                                    </div>
                                                );
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
