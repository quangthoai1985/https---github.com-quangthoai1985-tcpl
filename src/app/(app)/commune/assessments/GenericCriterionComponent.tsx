'use client';

import React from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Assessment, Criterion, Indicator, IndicatorResult } from "@/lib/data";
import type { AssessmentStatus, AssessmentValues } from './types';
import StatusBadge from './StatusBadge';
import IndicatorAssessment from './IndicatorAssessment';
import Criterion2_Indicator4_Component from './Criterion2_Indicator4_Component';

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
    communeId
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
                        
                        if (indicator.id === 'CT033278') {
                            return (
                                <Criterion2_Indicator4_Component
                                    key={indicator.id}
                                    indicator={indicator}
                                    assessmentData={assessmentData}
                                    onValueChange={onValueChange}
                                    onNoteChange={onNoteChange}
                                    onEvidenceChange={onEvidenceChange}
                                    onPreview={onPreview}
                                    periodId={periodId}
                                    communeId={communeId}
                                />
                            );
                        }

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
                                                const subBlockClasses = cn(
                                                    "relative pl-6 transition-colors rounded-r-lg py-4",
                                                     assessmentData[indicator.id].contentResults![content.id]?.status === 'achieved' && 'bg-green-50',
                                                     assessmentData[indicator.id].contentResults![content.id]?.status === 'not-achieved' && 'bg-red-50',
                                                     assessmentData[indicator.id].contentResults![content.id]?.status === 'pending' && 'bg-amber-50 border-l-amber-200'
                                                );
                                                const contentData = assessmentData[indicator.id]?.contentResults?.[content.id];
                                                if (!contentData) return null;
                                                return (
                                                  <div key={content.id} className={subBlockClasses}>
                                                      <CornerDownRight className="absolute -left-3 top-5 h-5 w-5 text-muted-foreground"/>
                                                      <IndicatorAssessment
                                                          specialIndicatorIds={specialLogicIndicatorIds}
                                                          specialLabels={getSpecialIndicatorLabels(content.id, criteria)}
                                                          customBooleanLabels={getCustomBooleanLabels(content.id, criteria)}
                                                          checkboxOptions={getCheckboxOptions(content.id, criteria)}
                                                          indicator={content}
                                                          data={contentData}
                                                          onValueChange={(id, value, cId) => onValueChange(indicator.id, value, cId)}
                                                          onNoteChange={(id, note, cId) => onNoteChange(indicator.id, note, cId)}
                                                          onEvidenceChange={(id, files, docIdx, fileToDel, cId) => onEvidenceChange(indicator.id, files, docIdx, fileToDel, cId)}
                                                          onIsTaskedChange={onIsTaskedChange}
                                                          onPreview={onPreview}
                                                          criteria={criteria}
                                                          assessmentData={assessmentData}
                                                          contentId={content.id}
                                                          parentIndicatorId={indicator.id}
                                                      />
                                                  </div>
                                                )
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
