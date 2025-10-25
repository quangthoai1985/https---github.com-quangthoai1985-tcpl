
'use client';

import React from 'react';
import Criterion1Component from './Criterion1Component';
import type { Assessment, AssessmentStatus, AssessmentValues } from './types';
import type { Criterion } from '@/lib/data';

// This component acts as a dispatcher. It decides which specific
// component to render based on the criterion's ID.
const CriterionRenderer = ({
    criterion,
    criterionStatus,
    assessmentData,
    onValueChange,
    onNoteChange,
    onEvidenceChange,
    onIsTaskedChange,
    onPreview,
    criteria,
    periodId,
    communeId,
    handleCommuneDocsChange,
    updateSingleAssessment,
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
    periodId: string;
    communeId: string;
    handleCommuneDocsChange: (indicatorId: string, docs: any[]) => void;
    updateSingleAssessment: (assessment: Partial<Assessment>) => Promise<void>;
}) => {
    switch (criterion.id) {
        case 'TC01':
            return (
                <Criterion1Component
                    criterion={criterion}
                    criterionStatus={criterionStatus}
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
            );
        // Other criteria will be rendered with specialized components based on inputType
    }

    // Return null or a placeholder if no component matches
    return null;
};

export default CriterionRenderer;

