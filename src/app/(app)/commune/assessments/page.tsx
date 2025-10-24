
'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, Download, Eye } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/context/DataContext";
import PageHeader from "@/components/layout/page-header";
import type { Indicator, Criterion, Assessment, IndicatorResult, Content } from '@/lib/data';
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AssessmentStatus, FileWithStatus, IndicatorValue, AssessmentValues } from './types';
import Criterion1Component from "./Criterion1Component";
import { cn } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import RenderBooleanIndicator from "./RenderBooleanIndicator";
import RenderPercentageRatioIndicator from "./RenderPercentageRatioIndicator";
import RenderNumberIndicator from "./RenderNumberIndicator";
import RenderCheckboxGroupIndicator from "./RenderCheckboxGroupIndicator";
import RenderTextIndicator from "./RenderTextIndicator";
import RenderTC1LikeIndicator from "./RenderTC1LikeIndicator";


const evaluateStatus = (value: any, standardLevel: string, files: FileWithStatus[], isTasked?: boolean | null, assignedCount?: number, filesPerDocument?: { [documentIndex: number]: FileWithStatus[] }, contentId?: string): AssessmentStatus => {
    // LOGIC RIÊNG CHO NỘI DUNG 1 CỦA CHỈ TIÊU 4
    if (contentId === 'CNT033278') {
        const hasValidFile = (files || []).some(f => f.signatureStatus === 'valid');
        if (hasValidFile) return 'achieved';

        const hasInvalidFile = (files || []).some(f => f.signatureStatus === 'invalid' || f.signatureStatus === 'error');
        if (hasInvalidFile) return 'not-achieved';
        
        // Nếu không có file hợp lệ hoặc không hợp lệ, thì là pending (chờ upload, hoặc đang validating)
        return 'pending';
    }

    if (isTasked === false) {
        return 'achieved';
    }

    const hasFileEvidence = (files || []).length > 0;

    // Logic for Criterion 1 indicators
    if (assignedCount && assignedCount > 0) {
        const enteredValue = Number(value);
        if (isNaN(enteredValue) || value === null || value === '') return 'pending';

        const quantityMet = enteredValue >= assignedCount;

        if (filesPerDocument) {
            const allFiles = Object.values(filesPerDocument).flat();
            const uploadedCount = allFiles.length;
            const requiredFilesMet = uploadedCount >= enteredValue; 
            const allSignaturesValid = allFiles.every(f => 'signatureStatus' in f && f.signatureStatus === 'valid');
            
            if (quantityMet && requiredFilesMet && allSignaturesValid) {
                return 'achieved';
            }
        }
        return 'not-achieved';
    }

    // General logic for other indicators/contents
    if (value === undefined || value === null || value === '') {
        return 'pending';
    }
    
    if (!hasFileEvidence) {
        return 'not-achieved';
    }
    
    // Logic for checkbox groups
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (value.hasOwnProperty('total') && value.hasOwnProperty('provided')) {
            const total = Number(value.total);
            const provided = Number(value.provided);
            if (isNaN(total) || total === 0) return 'achieved'; // Không có yêu cầu thì coi như đạt
            if (isNaN(provided)) return 'pending';
            return (provided / total) >= 1 ? 'achieved' : 'not-achieved';
        }

        const checkedCount = Object.values(value).filter(v => v === true).length;
        const requiredCountMatch = standardLevel.match(/(\d+)/);
        if (requiredCountMatch) {
            const requiredCount = parseInt(requiredCountMatch[0], 10);
            return checkedCount >= requiredCount ? 'achieved' : 'not-achieved';
        }
        return 'pending';
    }

    // General logic for boolean and number/string comparison
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

const sanitizeDataForFirestore = (data: AssessmentValues): Record<string, IndicatorResult> => {
    const sanitizedData: Record<string, IndicatorResult> = {};
    const sanitizeFiles = (files: FileWithStatus[]) => (files || []).map(f => {
        if (f instanceof File) {
            // This case should ideally not happen if uploads are complete, but as a fallback:
            return { name: f.name, url: '' }; // Don't save File objects
        }
        return {
            name: f.name,
            url: f.url || '',
            signatureStatus: f.signatureStatus || null,
            signatureError: f.signatureError || null,
            contentCheckStatus: f.contentCheckStatus || null,
            contentCheckIssues: f.contentCheckIssues || null
        };
    });

    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const indicatorData = data[key];

            sanitizedData[key] = {
                isTasked: indicatorData.isTasked === undefined ? null : indicatorData.isTasked,
                value: indicatorData.value === undefined ? null : indicatorData.value,
                note: indicatorData.note || '',
                status: indicatorData.status,
                adminNote: indicatorData.adminNote || '',
                communeNote: indicatorData.communeNote || '',
                files: sanitizeFiles(indicatorData.files || []),
                filesPerDocument: indicatorData.filesPerDocument ? Object.fromEntries(
                    Object.entries(indicatorData.filesPerDocument).map(([idx, fileList]) => [idx, sanitizeFiles(fileList || [])])
                ) : {},
                 communeDefinedDocuments: indicatorData.communeDefinedDocuments || null,
                 contentResults: indicatorData.contentResults ? Object.fromEntries(
                    Object.entries(indicatorData.contentResults).map(([contentId, contentData]) => [contentId, {
                        ...contentData,
                        files: sanitizeFiles(contentData.files)
                    }])
                 ) : {},
                 meta: indicatorData.meta || {}
            };
        }
    }
    return sanitizedData;
};

export default function SelfAssessmentPage() {
  const router = useRouter();
  const { storage, currentUser, assessmentPeriods, criteria, assessments, updateAssessments, updateSingleAssessment, deleteFileByUrl } = useData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewFile, setPreviewFile] = useState<{name: string, url: string} | null>(null);

  const unsavedFilesRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      if (unsavedFilesRef.current.length > 0) {
        const filesToDelete = [...unsavedFilesRef.current];
        filesToDelete.forEach(async (fileUrl) => {
          try {
            await deleteFileByUrl(fileUrl);
          } catch (error) {
            console.error(`Lỗi khi dọn dẹp tệp mồ côi ${fileUrl}:`, error);
          }
        });
        unsavedFilesRef.current = [];
      }
    };
  }, [deleteFileByUrl]);

  const initializeState = useCallback((criteria: Criterion[], existingData?: Record<string, IndicatorResult>): AssessmentValues => {
      const initialState: AssessmentValues = {};
      criteria.forEach(criterion => {
          (criterion.indicators || []).forEach(indicator => {
              const savedIndicator = existingData?.[indicator.id];
              
              initialState[indicator.id] = {
                isTasked: savedIndicator?.isTasked ?? null,
                value: savedIndicator?.value ?? '',
                files: savedIndicator?.files ?? [],
                filesPerDocument: savedIndicator?.filesPerDocument ?? {},
                note: savedIndicator?.note ?? '',
                status: savedIndicator?.status ?? 'pending',
                adminNote: savedIndicator?.adminNote ?? '',
                communeNote: savedIndicator?.communeNote ?? '',
                communeDefinedDocuments: savedIndicator?.communeDefinedDocuments ?? [],
                contentResults: {},
                meta: savedIndicator?.meta || {}
            };
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
        const newState = initializeState(criteria, myAssessment.assessmentData);
        setAssessmentData(newState);
    }
  }, [myAssessment, criteria, initializeState]);

  const findIndicator = useCallback((indicatorId: string): Indicator | Content | null => {
      for (const criterion of criteria) {
          for (const indicator of (criterion.indicators || [])) {
              if (indicator.id === indicatorId) return indicator;
          }
      }
      return null;
  }, [criteria]);

  const calculateCompositeStatus = useCallback((originalParentId: string, assessmentData: AssessmentValues): AssessmentStatus => {
    const childIndicators = criteria.flatMap(c => c.indicators).filter(i => i.originalParentIndicatorId === originalParentId);
    
    if (childIndicators.length === 0) {
        return 'pending'; 
    }

    let hasPending = false;
    for (const child of childIndicators) {
        const childStatus = assessmentData[child.id]?.status;
        if (childStatus === 'not-achieved') {
            return 'not-achieved';
        }
        if (childStatus === 'pending') {
            hasPending = true;
        }
    }

    return hasPending ? 'pending' : 'achieved';
}, [criteria]);

const calculateCriterionStatus = useCallback((criterion: Criterion): AssessmentStatus => {
    if (!assessmentData || Object.keys(assessmentData).length === 0 || !criterion.indicators || criterion.indicators.length === 0) {
        return 'pending';
    }

    // Xử lý riêng cho Tiêu chí 1
    if (criterion.id === 'TC01') {
        const firstIndicatorId = criterion.indicators[0]?.id;
        if (firstIndicatorId && assessmentData[firstIndicatorId]?.isTasked === false) {
            return 'achieved';
        }
    }
    
    const compositeParents = ['CT2.1', 'CT2.4', 'CT2.6', 'CT2.7', 'CT3.1', 'CT3.2'];
    let hasPending = false;

    for (const indicator of criterion.indicators) {
        // Bỏ qua các chỉ tiêu con, chúng sẽ được tính trong chỉ tiêu cha
        if (indicator.originalParentIndicatorId) {
            continue;
        }
        
        let effectiveStatus: AssessmentStatus;

        if (compositeParents.includes(indicator.id)) {
            effectiveStatus = calculateCompositeStatus(indicator.id, assessmentData);
        } else {
            effectiveStatus = assessmentData[indicator.id]?.status || 'pending';
        }
        
        if (effectiveStatus === 'not-achieved') {
            return 'not-achieved';
        }
        if (effectiveStatus === 'pending') {
            hasPending = true;
        }
    }

    return hasPending ? 'pending' : 'achieved';
}, [assessmentData, calculateCompositeStatus]);

const handleIsTaskedChange = useCallback((id: string, isTasked: boolean) => {
    setAssessmentData(prev => {
        const item = findIndicator(id); 
        if (!item) return prev;

        const newData = { ...prev };
        
        const indicatorId = id;
        const indicatorData = { ...newData[indicatorId] }; 
        const valueToEvaluate = isTasked ? indicatorData.value : null;
        const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === indicatorId));
        
        let assignedCount;
        if (parentCriterion?.id === 'TC01' || (parentCriterion?.id === 'TC02' && indicatorId === 'CT033278')) {
            const tc1Data = prev[criteria[0].indicators[0].id];
            assignedCount = (item as Indicator).assignedDocumentsCount || tc1Data.communeDefinedDocuments?.length || 0;
        } else if (criteria[1]?.indicators?.[1]?.id === indicatorId) {
             const tc1Data = prev[criteria[0].indicators[0].id];
             assignedCount = criteria[0]?.assignedDocumentsCount || tc1Data.communeDefinedDocuments?.length || 0;
        }
        
        const files = isTasked ? indicatorData.files : [];
        const filesPerDocument = (parentCriterion?.id === 'TC01' || indicatorId === 'CT033278') ? indicatorData.filesPerDocument : undefined;
        const newStatus = evaluateStatus(valueToEvaluate, item.standardLevel, files, isTasked, assignedCount, filesPerDocument);

        newData[indicatorId] = {
            ...indicatorData,
            isTasked: isTasked,
            status: newStatus,
            value: isTasked ? indicatorData.value : null,
            files: isTasked ? indicatorData.files : [],
            filesPerDocument: isTasked ? indicatorData.filesPerDocument : {},
        };
        
        return newData;
    });
}, [criteria, findIndicator]);


const handleValueChange = useCallback((indicatorId: string, value: any, contentId?: string) => {
    setAssessmentData(prev => {
        const indicator = findIndicator(indicatorId) as Indicator | null;
        if (!indicator) return prev;

        const newData = { ...prev };
        const isTasked = prev[indicatorId].isTasked;
        const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === indicatorId));

        let assignedCount;
        if (parentCriterion?.id === 'TC01' || (parentCriterion?.id === 'TC02' && indicatorId === 'CT033278')) {
             const tc1Data = prev[criteria[0].indicators[0].id];
             assignedCount = (indicator as Indicator).assignedDocumentsCount || tc1Data.communeDefinedDocuments?.length || 0;
        } else if (criteria[1]?.indicators?.[1]?.id === indicatorId) {
             const tc1Data = prev[criteria[0].indicators[0].id];
             assignedCount = criteria[0]?.assignedDocumentsCount || tc1Data.communeDefinedDocuments?.length || 0;
        }

        const filesPerDocument = (parentCriterion?.id === 'TC01' || indicatorId === 'CT033278') ? prev[indicatorId].filesPerDocument : undefined;
        const newStatus = evaluateStatus(value, indicator.standardLevel, prev[indicatorId].files, isTasked, assignedCount, filesPerDocument);

        newData[indicatorId] = {
            ...newData[indicatorId],
            value: value,
            status: newStatus
        };
        
        return newData;
    });
}, [criteria, findIndicator]);

const handleCommuneDocsChange = useCallback((indicatorId: string, docs: any[]) => {
    setAssessmentData(prev => ({
        ...prev,
        [indicatorId]: {
            ...prev[indicatorId],
            communeDefinedDocuments: docs,
        }
    }));
}, []);

const handleNoteChange = useCallback((indicatorId: string, note: string, contentId?: string) => {
    setAssessmentData(prev => {
        const newData = { ...prev };
        newData[indicatorId] = {
            ...newData[indicatorId],
            note: note,
        };
        return newData;
    });
}, []);

const handleEvidenceChange = useCallback(async (indicatorId: string, newFiles: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus, contentId?: string) => {
    const isLink = (file: any): file is { name: string; url: string } => {
        return typeof file.url === 'string' && (file.url.startsWith('http://') || file.url.startsWith('https://'));
    };

    // If removing a file, check if it's a real storage file or just a link
    if (fileToRemove?.url && !isLink(fileToRemove)) {
        try {
            await deleteFileByUrl(fileToRemove.url);
            toast({
                title: "Đã xóa tệp",
                description: `Tệp "${fileToRemove.name}" đã được xóa khỏi hệ thống.`,
            });
        } catch (error) {
            console.error("Lỗi khi xóa tệp:", error);
            toast({
                variant: "destructive",
                title: "Lỗi xóa tệp",
                description: `Không thể xóa tệp "${fileToRemove.name}".`,
            });
            return; // Stop update if file deletion fails
        }
    }

    setAssessmentData(prev => {
        const newData = { ...prev };
        const item = findIndicator(indicatorId) as Indicator | Content | null;
        if (!item) return prev;

        const indicatorData = { ...newData[indicatorId] };
        
        let fileList: FileWithStatus[];
        let currentValue: any;

        if (docIndex !== undefined) {
             const filesPerDoc = { ...(indicatorData.filesPerDocument || {}) };
             fileList = [...(filesPerDoc[docIndex] || [])];
             currentValue = indicatorData.value;

             if (fileToRemove) {
                fileList = fileList.filter(f => f.name !== fileToRemove.name);
             } else {
                fileList.push(...newFiles);
             }

            filesPerDoc[docIndex] = fileList;
            indicatorData.filesPerDocument = filesPerDoc;

            const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === indicatorId));
            let assignedCount;
            if (parentCriterion?.id === 'TC01' || (parentCriterion?.id === 'TC02' && indicatorId === 'CT033278')) {
                const tc1Data = prev[criteria[0].indicators[0].id];
                assignedCount = (item as Indicator).assignedDocumentsCount || tc1Data.communeDefinedDocuments?.length || 0;
            }
            indicatorData.status = evaluateStatus(currentValue, item.standardLevel, [], indicatorData.isTasked, assignedCount, filesPerDoc);

        } else {
            fileList = [...(indicatorData.files || [])];
            currentValue = indicatorData.value;
             if (fileToRemove) {
                fileList = fileList.filter(f => f.name !== fileToRemove.name);
             } else {
                fileList.push(...newFiles);
                newFiles.forEach(file => {
                    if (!(file instanceof File) && file.url && !isLink(file)) {
                        unsavedFilesRef.current.push(file.url);
                    }
                });
             }
            indicatorData.files = fileList;
            indicatorData.status = evaluateStatus(currentValue, item.standardLevel, fileList, indicatorData.isTasked);
        }

        newData[indicatorId] = indicatorData;
        return newData;
    });
}, [criteria, deleteFileByUrl, findIndicator, toast]);


const handleSaveDraft = useCallback(async () => {
    if (!activePeriod || !currentUser || !storage) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy kỳ đánh giá hoặc người dùng.' });
        return;
    }

    setIsSubmitting(true);
    const savingToast = toast({ title: 'Đang lưu nháp...' });

    try {
        const uploadPromises: Promise<void>[] = [];
        const currentUnsavedUrls = [...unsavedFilesRef.current];
        unsavedFilesRef.current = [];

        for (const indicatorId in assessmentData) {
            const indicatorState = assessmentData[indicatorId];

            const processFileList = (files: any[], docIndex?: number, contentId?: string) => {
                files.forEach((file, fileIndex) => {
                    if (file instanceof File) {
                        const promise = async () => {
                            try {
                                 const filePath = contentId
                                    ? `hoso/${currentUser.communeId}/evidence/${activePeriod.id}/${indicatorId}/${contentId}/${file.name}`
                                    : docIndex !== undefined
                                        ? `hoso/${currentUser.communeId}/evidence/${activePeriod.id}/${indicatorId}/${docIndex}/${file.name}`
                                        : `hoso/${currentUser.communeId}/evidence/${activePeriod.id}/${indicatorId}/${file.name}`;
                                
                                const storageRef = ref(storage, filePath);
                                const snapshot = await uploadBytes(storageRef, file);
                                const downloadURL = await getDownloadURL(snapshot.ref);

                                if (contentId) {
                                    assessmentData[indicatorId].contentResults![contentId].files[fileIndex] = { name: file.name, url: downloadURL };
                                } else if (docIndex !== undefined) {
                                    assessmentData[indicatorId].filesPerDocument![docIndex][fileIndex] = { name: file.name, url: downloadURL };
                                } else {
                                    assessmentData[indicatorId].files[fileIndex] = { name: file.name, url: downloadURL };
                                }
                            } catch (uploadError) {
                                console.error(`Lỗi khi tải lên file ${file.name}:`, uploadError);
                                throw new Error(`Failed to upload ${file.name}`);
                            }
                        };
                        uploadPromises.push(promise());
                    }
                });
            };
            
            if (indicatorState.filesPerDocument) {
                for (const docIndex in indicatorState.filesPerDocument) {
                    processFileList(indicatorState.filesPerDocument[docIndex], Number(docIndex));
                }
            }
            
            if (indicatorState.contentResults) {
                for (const contentId in indicatorState.contentResults) {
                     processFileList(indicatorState.contentResults[contentId].files, undefined, contentId);
                }
            }

            if (indicatorState.files && !indicatorState.contentResults && Object.keys(indicatorState.filesPerDocument || {}).length === 0) {
                processFileList(indicatorState.files);
            }
        }

        await Promise.all(uploadPromises);

        const currentAssessment = assessments.find(a => a.assessmentPeriodId === activePeriod.id && a.communeId === currentUser.communeId);
        if (!currentAssessment) throw new Error("Không tìm thấy hồ sơ đăng ký hợp lệ.");

        const updatedAssessment: Assessment = {
            ...currentAssessment,
            assessmentStatus: 'draft',
            assessmentData: sanitizeDataForFirestore(assessmentData),
        };

        await updateSingleAssessment(updatedAssessment);

        currentUnsavedUrls.forEach(async (url) => {
            try {
                await deleteFileByUrl(url);
            } catch (error) {
            }
        });


        savingToast.dismiss();
        toast({
          title: "Lưu nháp thành công!",
          description: "Bạn có thể tiếp tục chỉnh sửa sau.",
        });

    } catch (error) {
        console.error("Lỗi khi lưu nháp:", error);
        savingToast.dismiss();
        toast({ 
            variant: 'destructive', 
            title: 'Lỗi khi lưu nháp', 
            description: 'Đã xảy ra lỗi khi tải tệp hoặc lưu dữ liệu.' 
        });
    } finally {
        setIsSubmitting(false);
    }
}, [activePeriod, currentUser, storage, assessmentData, assessments, updateSingleAssessment, toast, deleteFileByUrl]);

  useEffect(() => {
    const hasUnsavedFiles = Object.values(assessmentData).some(indicator =>
        (indicator.files || []).some(f => f instanceof File) ||
        (indicator.filesPerDocument && Object.values(indicator.filesPerDocument).some(list => list.some(f => f instanceof File))) ||
        (indicator.contentResults && Object.values(indicator.contentResults).some(res => (res.files || []).some(f => f instanceof File)))
    );

    if (hasUnsavedFiles) {
        const handler = setTimeout(() => {
            handleSaveDraft();
        }, 5000); // 5-second debounce

        return () => clearTimeout(handler);
    }
  }, [assessmentData, handleSaveDraft]);

  const { canSubmit, submissionErrors } = useMemo(() => {
    const errors: string[] = [];
    let allItemsAssessed = true;

    for (const id in assessmentData) {
        const data = assessmentData[id];
        const indicator = findIndicator(id) as Indicator;
        if (!indicator) continue;
        
        const checkEvidence = (itemData: any, itemName: string, isCriterion1: boolean) => {
            if (itemData.status !== 'pending' && itemData.isTasked !== false) {
                 if (isCriterion1) {
                    const assignedDocsCount = (criteria.find(c=>c.id === 'TC01') as Criterion).assignedDocumentsCount || itemData.communeDefinedDocuments?.length || 0;
                    if (assignedDocsCount > 0 && Number(itemData.value) > 0) {
                        const docIndicesWithMissingFiles = Array.from({length: Number(itemData.value)}, (_, i) => i)
                           .filter(i => (itemData.filesPerDocument?.[i] || []).length === 0);
                        if (docIndicesWithMissingFiles.length > 0) {
                            errors.push(`Chỉ tiêu "${itemName}" yêu cầu minh chứng cho mỗi văn bản đã ban hành.`);
                        }
                    }
                 } else if ((itemData.files || []).length === 0) {
                    errors.push(`Mục "${itemName}" yêu cầu minh chứng.`);
                 }
            }
        };
        
        if (data.status === 'pending') allItemsAssessed = false;
        const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === id));
        const isCriterion1 = parentCriterion?.id === 'TC01' || (parentCriterion?.id === 'TC02' && id === 'CT033278');
        checkEvidence(data, indicator.name, isCriterion1);
        
    }

    if (!allItemsAssessed) {
        errors.push("Bạn phải hoàn thành việc chấm điểm cho tất cả các chỉ tiêu/nội dung.");
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
        await handleSaveDraft();
        const myAssessmentAfterDraft = assessments.find(a => a.assessmentPeriodId === activePeriod.id && a.communeId === currentUser.communeId);

        if (!myAssessmentAfterDraft) {
             toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy hồ sơ đăng ký hợp lệ.' });
             setIsSubmitting(false);
             return;
        }

        const updatedAssessment: Assessment = {
            ...myAssessmentAfterDraft,
            assessmentStatus: 'pending_review',
            assessmentSubmissionDate: new Date().toLocaleDateString('vi-VN'),
            submittedBy: currentUser.id,
        };

        await updateSingleAssessment(updatedAssessment);
        unsavedFilesRef.current = [];

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

  const handlePreview = (file: { name: string, url: string }) => {
    setPreviewFile(file);
};

  if (criteria.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Đang tải bộ tiêu chí...</span>
        </div>
      )
  }

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

                            // Xử lý riêng cho Tiêu chí 1 nếu bạn muốn giữ component riêng
                            if (criterion.id === 'TC01') {
                                return (
                                    // Return trực tiếp Criterion1Component, không cần AccordionItem ở đây
                                    <Criterion1Component
                                        key={criterion.id} // Key đặt ở đây
                                        criterion={criterion}
                                        criterionStatus={criterionStatus}
                                        assessmentData={assessmentData}
                                        onValueChange={handleValueChange}
                                        onNoteChange={handleNoteChange}
                                        onEvidenceChange={handleEvidenceChange}
                                        onIsTaskedChange={handleIsTaskedChange}
                                        onPreview={handlePreview}
                                        periodId={activePeriod!.id}
                                        communeId={currentUser!.communeId}
                                        handleCommuneDocsChange={handleCommuneDocsChange}
                                    />
                                );
                            }

                            const triggerClasses = cn(
                                "font-headline text-lg rounded-md px-4 transition-colors hover:no-underline",
                                criterionStatus === 'achieved' && 'bg-green-100 hover:bg-green-200/80',
                                criterionStatus === 'not-achieved' && 'bg-red-100 hover:bg-red-200/80',
                                criterionStatus === 'pending' && 'bg-amber-100 hover:bg-amber-200/80',
                            );
                            
                            return (
                                <AccordionItem value={criterion.id} key={criterion.id}>
                                    <AccordionTrigger className={triggerClasses}>
                                        <div className="flex items-center gap-4 flex-1">
                                            <StatusBadge status={criterionStatus} isCriterion={true} />
                                            <span className="text-xl font-semibold">Tiêu chí {index + 1}: {criterion.name.replace(`Tiêu chí ${index + 1}: `, '')}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-8 pl-4 border-l-2 border-primary/20 ml-2 py-4">
                                            {criterion.indicators?.map(indicator => {
                                                const indicatorData = assessmentData[indicator.id];
                                                if (!indicatorData) {
                                                    return <div key={indicator.id}>Đang tải dữ liệu chỉ tiêu {indicator.name}...</div>;
                                                }
                                        
                                                switch (indicator.inputType) {
                                                    case 'boolean':
                                                        return <RenderBooleanIndicator key={indicator.id} indicator={indicator} data={indicatorData} onValueChange={handleValueChange} onNoteChange={handleNoteChange} onEvidenceChange={handleEvidenceChange} onPreview={handlePreview} />;
                                                    case 'percentage_ratio':
                                                        return <RenderPercentageRatioIndicator key={indicator.id} indicator={indicator} data={indicatorData} onValueChange={handleValueChange} onNoteChange={handleNoteChange} onEvidenceChange={handleEvidenceChange} onPreview={handlePreview} />;
                                                    case 'number':
                                                         return <RenderNumberIndicator key={indicator.id} indicator={indicator} data={indicatorData} onValueChange={handleValueChange} onNoteChange={handleNoteChange} onEvidenceChange={handleEvidenceChange} onPreview={handlePreview} />;
                                                    case 'checkbox_group':
                                                         return <RenderCheckboxGroupIndicator key={indicator.id} indicator={indicator} data={indicatorData} onValueChange={handleValueChange} onNoteChange={handleNoteChange} onEvidenceChange={handleEvidenceChange} onPreview={handlePreview} criteria={criteria} />;
                                                    case 'text':
                                                        return <RenderTextIndicator key={indicator.id} indicator={indicator} data={indicatorData} onValueChange={handleValueChange} onNoteChange={handleNoteChange} onEvidenceChange={handleEvidenceChange} onPreview={handlePreview} />;
                                                    case 'TC1_like': // Xử lý CT1.1, CT1.2, CT1.3, CT2.4.1
                                                         return (
                                                            <RenderTC1LikeIndicator // Gọi component chuyên biệt
                                                                key={indicator.id}
                                                                indicator={indicator} // Truyền indicator chứa config (assignmentType...)
                                                                data={indicatorData} // Truyền data chứa value, filesPerDocument...
                                                                assessmentData={assessmentData} // Truyền assessmentData đầy đủ
                                                                onValueChange={handleValueChange}
                                                                onNoteChange={handleNoteChange}
                                                                onEvidenceChange={handleEvidenceChange}
                                                                onIsTaskedChange={handleIsTaskedChange} // Cần prop này
                                                                onPreview={handlePreview}
                                                                periodId={activePeriod!.id}
                                                                communeId={currentUser!.communeId}
                                                                handleCommuneDocsChange={handleCommuneDocsChange} // Cần prop này
                                                            />
                                                         );
                                                    default:
                                                        // Fallback nếu inputType không xác định
                                                        return (
                                                            <div key={indicator.id} className="p-4 border rounded bg-destructive text-white">
                                                                Lỗi: Không thể render chỉ tiêu "{indicator.name}" (ID: {indicator.id}) với inputType không xác định: {indicator.inputType}
                                                            </div>
                                                        );
                                                }
                                            })}
                                            {(!criterion.indicators || criterion.indicators.length === 0) && (
                                                <p className="text-sm text-muted-foreground">Không có chỉ tiêu nào cho tiêu chí này.</p>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
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
                 <Button variant="secondary" asChild>
                    <a href={previewFile?.url} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4"/> Tải xuống
                    </a>
                 </Button>
                <Button variant="outline" onClick={() => setPreviewFile(null)}>Đóng</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
