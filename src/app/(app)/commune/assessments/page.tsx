
'use client'

import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, Download, Eye } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/context/DataContext";
import PageHeader from "@/components/layout/page-header";
import type { Indicator, Criterion, Assessment, IndicatorResult } from '@/lib/data';
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AssessmentStatus, FileWithStatus, IndicatorValue, AssessmentValues } from './types';
import Criterion1Component from "./Criterion1Component";


const evaluateStatus = (
    value: any,
    standardLevel: string,
    files: FileWithStatus[],
    isTasked?: boolean | null,
    assignedCount?: number,
    filesPerDocument?: { [documentIndex: number]: FileWithStatus[] },
    inputType?: string, // Thêm inputType để xác định logic
): AssessmentStatus => {
    
    // Luôn ưu tiên trạng thái "Không được giao"
    if (isTasked === false) {
        return 'achieved';
    }

    // Logic đặc biệt cho các file có kiểm tra chữ ký số
    if (inputType === 'TC1_like') {
        const allFiles = Object.values(filesPerDocument || {}).flat();
        if (allFiles.length === 0) return 'pending'; // Chưa có file thì chưa thể chấm
        
        const hasInvalid = allFiles.some(f => f.signatureStatus === 'invalid' || f.signatureStatus === 'error');
        if (hasInvalid) return 'not-achieved';
        
        const hasValidating = allFiles.some(f => f.signatureStatus === 'validating');
        if (hasValidating) return 'pending';
        
        const allValid = allFiles.every(f => f.signatureStatus === 'valid');
        if (allValid && (Number(value) >= (assignedCount || 0))) {
            return 'achieved';
        }
        // Nếu không đủ file valid hoặc số lượng không đạt
        return 'not-achieved';
    }


    const hasFileEvidence = (files || []).length > 0;
     if (!hasFileEvidence) {
        // Nếu đã có giá trị nhưng thiếu file, coi như 'not-achieved'
        if (value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0) && !(typeof value === 'object' && Object.keys(value).length === 0)) {
            return 'not-achieved';
        }
        // Nếu chưa có giá trị, là 'pending'
        return 'pending';
    }

    if (value === undefined || value === null || value === '') {
        return 'pending';
    }
    
    // Logic for checkbox groups
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Logic cho dạng tỷ lệ {total, completed/provided}
        if (value.hasOwnProperty('total') || value.hasOwnProperty('completed') || value.hasOwnProperty('provided')) {
             const total = Number(value.total || 0);
             const completed = Number(value.completed || value.provided || 0);
             if (total === 0) return 'achieved';
             if (isNaN(total) || isNaN(completed)) return 'pending';
             const requiredPercentageMatch = standardLevel.match(/(\d+)/);
             if (requiredPercentageMatch) {
                const requiredPercentage = parseInt(requiredPercentageMatch[0], 10);
                return (completed / total) * 100 >= requiredPercentage ? 'achieved' : 'not-achieved';
             }
        }
        
        // Logic cho checkbox thông thường
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
            return { name: f.name, url: '' }; 
        }
        return {
            name: f.name,
            url: f.url || '',
            signatureStatus: f.signatureStatus || null,
            signatureError: f.signatureError || null,
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
  
  const [communeDefinedDocsMap, setCommuneDefinedDocsMap] = useState<Record<string, any[]>>({}); 

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
    const initialCommuneDocsMap: Record<string, any[]> = {};

    criteria.forEach(criterion => {
        (criterion.indicators || []).forEach(indicator => {
            const savedIndicator = existingData?.[indicator.id];
            
            if (indicator.inputType === 'TC1_like' && savedIndicator?.communeDefinedDocuments) {
                initialCommuneDocsMap[indicator.id] = savedIndicator.communeDefinedDocuments;
            }

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
          };
        });
    });
    
    setCommuneDefinedDocsMap(initialCommuneDocsMap);
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
        
        const newCommuneDocsMap: Record<string, any[]> = {};
        for(const indicatorId in myAssessment.assessmentData) {
            const indicatorData = myAssessment.assessmentData[indicatorId];
            if(indicatorData.communeDefinedDocuments) {
                 newCommuneDocsMap[indicatorId] = indicatorData.communeDefinedDocuments;
            }
        }
        setCommuneDefinedDocsMap(newCommuneDocsMap);
    }
  }, [myAssessment, criteria, initializeState]);

  const calculateCriterionStatus = useCallback((criterion: Criterion): AssessmentStatus => {
    if (!assessmentData || Object.keys(assessmentData).length === 0 || !criterion.indicators || criterion.indicators.length === 0) {
        return 'pending';
    }

    if (criterion.id === 'TC01') {
        const firstIndicatorId = criterion.indicators[0]?.id;
        if (firstIndicatorId && assessmentData[firstIndicatorId]?.isTasked === false) {
            return 'achieved';
        }
    }
    
    let hasPending = false;

    for (const indicator of criterion.indicators) {
        const indicatorStatus = assessmentData[indicator.id]?.status;
        
        if (indicatorStatus === 'not-achieved') {
            return 'not-achieved';
        }
        if (indicatorStatus === 'pending') {
            hasPending = true;
        }
    }

    return hasPending ? 'pending' : 'achieved';
}, [assessmentData]);

const handleIsTaskedChange = useCallback((id: string, isTasked: boolean) => {
    setAssessmentData(prev => {
        const item = criteria.flatMap(c => c.indicators).find(i => i.id === id);
        if (!item) return prev;

        const newData = { ...prev };
        
        const indicatorId = id;
        const indicatorData = { ...newData[indicatorId] }; 
        const valueToEvaluate = isTasked ? indicatorData.value : null;
        
        let assignedCount;
        const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === indicatorId));

        if (parentCriterion?.id === 'TC01' || item.inputType === 'TC1_like') {
            const tc1Data = prev[criteria[0].indicators[0].id];
            assignedCount = (item as Indicator).assignedDocumentsCount || tc1Data.communeDefinedDocuments?.length || 0;
        }
        
        const files = isTasked ? indicatorData.files : [];
        const filesPerDocument = item.inputType === 'TC1_like' ? indicatorData.filesPerDocument : undefined;
        const newStatus = evaluateStatus(valueToEvaluate, item.standardLevel, files, isTasked, assignedCount, filesPerDocument, item.inputType);

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
}, [criteria]);


const handleValueChange = useCallback((id: string, value: any) => {
    setAssessmentData(prev => {
        const newData = { ...prev };
        const indicatorData = { ...newData[id] };
        
        const targetItem = criteria.flatMap(c => c.indicators).find(i => i.id === id);
        const isTasked = indicatorData.isTasked;
        if (!targetItem) return prev;

        indicatorData.value = value;
        indicatorData.status = evaluateStatus(value, targetItem.standardLevel, indicatorData.files, isTasked, targetItem.assignedDocumentsCount, indicatorData.filesPerDocument, targetItem.inputType);
        
        newData[id] = indicatorData;

        return newData;
    });
}, [criteria]);

const handleCommuneDocsChange = useCallback((indicatorId: string, docs: any[]) => {
    setCommuneDefinedDocsMap(prevMap => ({
        ...prevMap,
        [indicatorId]: docs,
    }));
    // Also update assessmentData for draft saving
    setAssessmentData(prev => ({
        ...prev,
        [indicatorId]: {
            ...(prev[indicatorId] || { status: 'pending', value: null, files: [], note: '' }), // Ensure object exists
            communeDefinedDocuments: docs,
        }
    }));
}, []);

const handleNoteChange = useCallback((indicatorId: string, note: string) => {
    setAssessmentData(prev => {
        const newData = { ...prev };
        const indicatorData = { ...newData[indicatorId] };
        indicatorData.note = note;
        newData[indicatorId] = indicatorData;
        return newData;
    });
}, []);

const handleEvidenceChange = useCallback(async (indicatorId: string, newFiles: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus) => {
    const isLink = (file: any): file is { name: string; url: string } => {
        return typeof file.url === 'string' && (file.url.startsWith('http://') || file.url.startsWith('https://'));
    };

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
            return;
        }
    }

    setAssessmentData(prev => {
        const newData = { ...prev };
        const indicatorData = { ...newData[indicatorId] };
        
        const targetItem = criteria.flatMap(c => c.indicators).find(i => i.id === indicatorId);
        if(!targetItem) return prev;

        if (docIndex !== undefined) {
             // Cập nhật cho filesPerDocument (TC1, TC1_like)
            const filesPerDoc = { ...(indicatorData.filesPerDocument || {}) };
            const currentFiles = filesPerDoc[docIndex] || [];
             let updatedFiles;
            if (fileToRemove) {
                updatedFiles = currentFiles.filter(f => f.name !== fileToRemove.name);
            } else {
                updatedFiles = [...currentFiles, ...newFiles];
            }
            filesPerDoc[docIndex] = updatedFiles;
            indicatorData.filesPerDocument = filesPerDoc;
            
            indicatorData.status = evaluateStatus(indicatorData.value, targetItem.standardLevel, [], indicatorData.isTasked, targetItem.assignedDocumentsCount, filesPerDoc, targetItem.inputType);
        } else {
             // Cập nhật cho mảng files (các chỉ tiêu thường)
             const currentFiles = indicatorData.files || [];
             let updatedFiles;
             if (fileToRemove) {
                updatedFiles = currentFiles.filter(f => f.name !== fileToRemove.name);
             } else {
                updatedFiles = [...currentFiles, ...newFiles];
             }
             indicatorData.files = updatedFiles;
             indicatorData.status = evaluateStatus(indicatorData.value, targetItem.standardLevel, updatedFiles, indicatorData.isTasked);
        }

        newData[indicatorId] = indicatorData;
        return newData;
    });
}, [deleteFileByUrl, toast, criteria]);


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

            const processFileList = (files: any[], docIndex?: number) => {
                files.forEach((file, fileIndex) => {
                    if (file instanceof File) {
                        const promise = async () => {
                            try {
                                 const filePath = docIndex !== undefined
                                        ? `hoso/${currentUser.communeId}/evidence/${activePeriod.id}/${indicatorId}/${docIndex}/${file.name}`
                                        : `hoso/${currentUser.communeId}/evidence/${activePeriod.id}/${indicatorId}/${file.name}`;
                                
                                const storageRef = ref(storage, filePath);
                                const snapshot = await uploadBytes(storageRef, file);
                                const downloadURL = await getDownloadURL(snapshot.ref);

                                if (docIndex !== undefined) {
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

            if (indicatorState.files && Object.keys(indicatorState.filesPerDocument || {}).length === 0) {
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
        (indicator.filesPerDocument && Object.values(indicator.filesPerDocument).some(list => list.some(f => f instanceof File)))
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

    for (const indicator of criteria.flatMap(c => c.indicators)) {
        const data = assessmentData[indicator.id];
        if (!data || data.status === 'pending') {
            allItemsAssessed = false;
        }
        if (data && data.status !== 'pending' && data.isTasked !== false) {
             if (indicator.inputType === 'TC1_like') {
                 const assignedDocsCount = indicator.assignedDocumentsCount || data.communeDefinedDocuments?.length || 0;
                 if (assignedDocsCount > 0 && Number(data.value) > 0) {
                     const docIndicesWithMissingFiles = Array.from({length: Number(data.value)}, (_, i) => i)
                        .filter(i => (data.filesPerDocument?.[i] || []).length === 0);
                     if (docIndicesWithMissingFiles.length > 0) {
                         errors.push(`Chỉ tiêu "${indicator.name}" yêu cầu minh chứng cho mỗi văn bản.`);
                     }
                 }
             } else if ((data.files || []).length === 0) {
                 errors.push(`Chỉ tiêu "${indicator.name}" yêu cầu minh chứng.`);
             }
        }
    }


    if (!allItemsAssessed) {
        errors.push("Bạn phải hoàn thành việc chấm điểm cho tất cả các chỉ tiêu/nội dung.");
    }

    return { canSubmit: errors.length === 0, submissionErrors: [...new Set(errors)] };
}, [assessmentData, criteria]);


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
                          const firstIndicatorId = criterion.indicators[0]?.id;

                          if (criterion.id === 'TC01' && firstIndicatorId) {
                                const docsToRenderForTC1 = useMemo(() => {
                                    const firstIndicatorData = assessmentData[firstIndicatorId];
                                    const currentCommuneDocs = firstIndicatorData?.communeDefinedDocuments || [];
                                    
                                    if (criterion.assignmentType === 'specific') {
                                        return criterion.documents || [];
                                    } else { // assignmentType === 'quantity'
                                        const adminCount = criterion.assignedDocumentsCount || 0;
                                        if (adminCount > 0) {
                                            return Array.from({ length: adminCount }, (_, i) => currentCommuneDocs[i] || { name: '', issueDate: '', excerpt: '', issuanceDeadlineDays: 30 });
                                        } else {
                                            const communeEnteredCount = Number(firstIndicatorData?.value || 0);
                                            return Array.from({ length: communeEnteredCount }, (_, i) => currentCommuneDocs[i] || { name: '', issueDate: '', excerpt: '', issuanceDeadlineDays: 30 });
                                        }
                                    }
                                }, [criterion.assignmentType, criterion.documents, criterion.assignedDocumentsCount, assessmentData[firstIndicatorId]]);

                                const assignedCountForTC1 = useMemo(() => {
                                    return criterion.assignedDocumentsCount || (Array.isArray(docsToRenderForTC1) ? docsToRenderForTC1.length : 0) || 0;
                                }, [criterion.assignedDocumentsCount, docsToRenderForTC1]);

                                return (
                                    <Criterion1Component
                                        key={criterion.id}
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
                                        docsToRender={docsToRenderForTC1}
                                        assignedCount={assignedCountForTC1}
                                    />
                                );
                            }

                            // Fallback for other criteria - will be replaced
                            return (
                               <div key={criterion.id}>Render cho {criterion.name}</div>
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
