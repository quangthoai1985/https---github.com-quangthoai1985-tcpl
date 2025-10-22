

'use client'

import { Accordion } from "@/components/ui/accordion";
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
import GenericCriterionComponent from "./GenericCriterionComponent";


const getSpecialLogicIndicatorIds = (criteria: Criterion[]): string[] => {
    if (!criteria || criteria.length < 3) return [];

    const secondCriterion = criteria[1];
    let specialIdsFromSecondCriterion: string[] = [];
    if (secondCriterion.indicators?.length >= 2) specialIdsFromSecondCriterion.push(secondCriterion.indicators[1].id);
    if (secondCriterion.indicators?.length >= 3) specialIdsFromSecondCriterion.push(secondCriterion.indicators[2].id);
    if (secondCriterion.indicators?.length > 3 && secondCriterion.indicators[3].contents?.length > 2) specialIdsFromSecondCriterion.push(secondCriterion.indicators[3].contents[2].id);
    
    const thirdCriterion = criteria[2];
    let specialIdsFromThirdCriterion: string[] = [];
    if (thirdCriterion.indicators?.length > 0 && thirdCriterion.indicators[0].contents?.length > 0) specialIdsFromThirdCriterion.push(thirdCriterion.indicators[0].contents[0].id);
    if (thirdCriterion.indicators?.length > 0 && thirdCriterion.indicators[0].contents?.length > 1) specialIdsFromThirdCriterion.push(thirdCriterion.indicators[0].contents[1].id);
    if (thirdCriterion.indicators?.length > 1 && thirdCriterion.indicators[1].contents?.length > 0) specialIdsFromThirdCriterion.push(thirdCriterion.indicators[1].contents[0].id);

    return [...specialIdsFromSecondCriterion, ...specialIdsFromThirdCriterion];
}

const getSpecialIndicatorLabels = (indicatorId: string, criteria: Criterion[]) => {
    if (!criteria || criteria.length < 3) return { no: 'Không được giao nhiệm vụ', yes: 'Được giao nhiệm vụ' };

    const indicator3_tc2_id = criteria[1].indicators?.length >= 3 ? criteria[1].indicators[2].id : null;
    const indicator4Criterion2Contents = criteria[1].indicators?.length > 3 ? criteria[1].indicators[3].contents : [];
    const subIndicator3_tc2_i4_id = indicator4Criterion2Contents && indicator4Criterion2Contents.length > 2 ? indicator4Criterion2Contents[2].id : null;

    const criterion3Indicator1Contents = criteria[2].indicators?.length > 0 ? criteria[2].indicators[0].contents : [];
    const subIndicator1_tc3_i1_id = criterion3Indicator1Contents && criterion3Indicator1Contents.length > 0 ? criterion3Indicator1Contents[0].id : null;
    const subIndicator2_tc3_i1_id = criterion3Indicator1Contents && criterion3Indicator1Contents.length > 1 ? criterion3Indicator1Contents[1].id : null;

    const criterion3Indicator2Contents = criteria[2].indicators?.length > 1 ? criteria[2].indicators[1].contents : [];
    const subIndicator1_tc3_i2_id = criterion3Indicator2Contents && criterion3Indicator2Contents.length > 0 ? criterion3Indicator2Contents[0].id : null;
    
    if (indicatorId === indicator3_tc2_id) return { no: "Không yêu cầu cung cấp", yes: "Có yêu cầu cung cấp" };
    if (indicatorId === subIndicator3_tc2_i4_id) return { no: "Không phát sinh nhiệm vụ ngoài kế hoạch", yes: "Có phát sinh nhiệm vụ ngoài kế hoạch" };
    if (indicatorId === subIndicator1_tc3_i1_id) return { no: "Không phát sinh yêu cầu thành lập", yes: "Có phát sinh yêu cầu kiện toàn, công nhận, cho thôi hòa giải viên" };
    if (indicatorId === subIndicator2_tc3_i1_id) return { no: "Không phát sinh yêu cầu kiện toàn, công nhận, cho thôi hòa giải viên", yes: "Có phát sinh yêu cầu kiện toàn, công nhận, cho thôi hòa giải viên" };
    if (indicatorId === subIndicator1_tc3_i2_id) return { no: "Không phát sinh vụ, việc hòa giải", yes: "Có phát sinh vụ, việc hòa giải" };

    return { no: 'Không được giao nhiệm vụ', yes: 'Được giao nhiệm vụ' };
}

const getCustomBooleanLabels = (indicatorId: string, criteria: Criterion[]) => {
    if (!criteria || criteria.length < 2) return null;
    const criterion2 = criteria[1];
    if (criterion2.indicators?.length > 3 && criterion2.indicators[3].contents?.length > 0) {
        const subIndicator1_tc2_i4_id = criterion2.indicators[3].contents[0].id;
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

    if (criterion2.indicators?.length > 4) {
        const targetIndicator = criterion2.indicators[4];
        if (indicatorId === targetIndicator.id || targetIndicator.contents?.some(c => c.id === indicatorId)) {
            return ["Tổ chức cuộc thi tìm hiểu pháp luật trực tuyến","Tổ chức tập huấn phổ biến kiến thức pháp luật và kỹ năng phổ biến, giáo dục pháp luật cho đội ngũ nhân lực làm công tác phổ biến, giáo dục pháp luật bằng hình thức trực tuyến","Phổ biến, giáo dục pháp luật trên Cổng Thông tin điện tử/Trang Thông tin điện tử của Hội đồng nhân dân, Uỷ ban nhân dân cấp xã và có sự kết nối với Cổng Pháp luật Quốc gia (đối với cấp xã đã có Cổng/Trang thông tin điện tử)","Sử dụng mạng xã hội và các nền tảng cộng đồng trực tuyến khác để thực hiện phổ biến, giáo dục pháp luật","Xây dựng, số hoá các tài liệu, sản phẩm truyền thông, phổ biến, giáo dục pháp luật như video clip, podcast, audio...","Xây dựng chatbox giải đáp pháp luật","Phổ biến, giáo dục pháp luật thông qua tin nhắn điện thoại","Hoạt động khác về chuyển đổi số, ứng dụng công nghệ số bảo đảm phù hợp"];
        }
    }
    if (criterion3.indicators?.length > 2) {
        const targetIndicator = criterion3.indicators[2];
        if (indicatorId === targetIndicator.id || targetIndicator.contents?.some(c => c.id === indicatorId)) {
            return ["Huy động đội ngũ luật sư, luật gia, Hội thẩm nhân dân, lực lượng Công an nhân dân, Bộ đội Biên phòng, báo cáo viên pháp luật, tuyên truyền viên pháp luật, lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở, người đã từng là Thẩm phán, Kiểm sát viên, Điều tra viên, người đã hoặc đang công tác trong lĩnh vực pháp luật tham gia làm hòa giải viên ở cơ sở.","Huy động đội ngũ nêu trên hỗ trợ pháp lý, tư vấn cho tổ hoà giải để giải quyết vụ, việc thuộc phạm vi hoà giải ở cơ sở.","Huy động đội ngũ nêu trên tham gia tập huấn, bồi dưỡng cho hoà giải viên.","Các hoạt động phối hợp, hỗ trợ hiệu quả của cá nhân, tổ chức khác trong triển khai công tác hòa giải ở cơ sở."];
        }
    }
    return null;
}

const evaluateStatus = (value: any, standardLevel: string, files: FileWithStatus[], isTasked?: boolean | null, assignedCount?: number, filesPerDocument?: { [documentIndex: number]: FileWithStatus[] }): AssessmentStatus => {
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
              const hasNewContents = indicator.contents && indicator.contents.length > 0;

              const contentResults: AssessmentValues[string]['contentResults'] = {};
              if (hasNewContents) {
                  indicator.contents!.forEach(content => {
                      const savedContent = savedIndicator?.contentResults?.[content.id];
                      contentResults[content.id] = {
                          value: savedContent?.value ?? '',
                          files: savedContent?.files ?? [],
                          status: savedContent?.status ?? 'pending',
                          note: savedContent?.note ?? '',
                      };
                  });
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
                contentResults: contentResults,
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

  const specialLogicIndicatorIds = React.useMemo(() => getSpecialLogicIndicatorIds(criteria), [criteria]);

  const findIndicator = useCallback((indicatorId: string): Indicator | Content | null => {
      for (const criterion of criteria) {
          for (const indicator of (criterion.indicators || [])) {
              if (indicator.id === indicatorId) return indicator;
              
              if (indicator.contents) {
                  const matchedContent = indicator.contents.find(content => content.id === indicatorId);
                  if (matchedContent) return matchedContent;
              }
          }
      }
      return null;
  }, [criteria]);

    const evaluateIndicatorByPassRule = (indicator: Indicator, contentResults: AssessmentValues[string]['contentResults']): AssessmentStatus => {
        if (!indicator.contents || indicator.contents.length === 0 || !contentResults) {
            return 'pending';
        }

        const passRule = indicator.passRule || { type: 'all' };
        const totalContents = indicator.contents.length;
        let metCount = 0;
        let hasPending = false;

        for (const content of indicator.contents) {
            const result = contentResults[content.id];
            if (!result || result.status === 'pending') {
                hasPending = true;
            } else if (result.status === 'achieved') {
                metCount++;
            }
        }
        
        if (hasPending) return 'pending';

        switch (passRule.type) {
            case 'all':
                return metCount === totalContents ? 'achieved' : 'not-achieved';
            case 'atLeast':
                return metCount >= (passRule.minCount || 1) ? 'achieved' : 'not-achieved';
            case 'percentage':
                 const percentage = (metCount / totalContents) * 100;
                return percentage >= (passRule.minPercent || 100) ? 'achieved' : 'not-achieved';
            default:
                return 'pending';
        }
    };


const handleIsTaskedChange = useCallback((id: string, isTasked: boolean) => {
    // 'id' có thể là indicator.id (đơn giản) hoặc content.id (phức tạp)
    setAssessmentData(prev => {
        const item = findIndicator(id); // item là Indicator hoặc Content
        if (!item) return prev;

        const newData = { ...prev };
        
        // Kiểm tra xem đây là Content hay Indicator
        const parentIndicator = criteria.flatMap(c => c.indicators).find(i => i.contents?.some(c => c.id === id));

        if (parentIndicator) { 
            // ============ ĐÂY LÀ LOGIC SỬA CHO CONTENT ITEM ============
            const contentId = id;
            
            // 1. Lấy dữ liệu của CHỈ TIÊU CHA
            const parentData = { ...newData[parentIndicator.id] }; 
            const contentResults = { ...(parentData.contentResults || {}) };
            
            // 2. Đảm bảo nội dung con này tồn tại trong state
            if (contentResults[contentId]) {
                const currentContentData = contentResults[contentId];
                const valueToEvaluate = isTasked ? currentContentData.value : null;
                // 'item' ở đây chính là object 'content'
                const newStatus = evaluateStatus(valueToEvaluate, item.standardLevel, isTasked ? currentContentData.files : [], isTasked);
                
                // 3. Cập nhật nội dung con (thêm/cập nhật trường isTasked)
                contentResults[contentId] = {
                    ...currentContentData,
                    isTasked: isTasked, 
                    status: newStatus,
                    value: isTasked ? currentContentData.value : null,
                    files: isTasked ? currentContentData.files : [],
                };

                // 4. Tính toán lại trạng thái cha
                const newParentStatus = evaluateIndicatorByPassRule(parentIndicator, contentResults);
                
                // 5. Cập nhật state của cha
                newData[parentIndicator.id] = {
                    ...parentData,
                    contentResults: contentResults,
                    status: newParentStatus,
                };
            }
        } else { 
            // ============ LOGIC CHO INDICATOR ĐƠN GIẢN (KHÔNG THAY ĐỔI) ============
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
        }
        return newData;
    });
}, [criteria, findIndicator]);


const handleValueChange = useCallback((indicatorId: string, value: any, contentId?: string) => {
    setAssessmentData(prev => {
        const indicator = findIndicator(indicatorId) as Indicator | null;
        if (!indicator) return prev;

        const newData = { ...prev };
        
        if (contentId) { // Updating a content item within an indicator
            const content = indicator.contents?.find(c => c.id === contentId);
            if (!content) return prev;

            const contentResults = { ...(newData[indicatorId].contentResults || {}) };
            const currentContentData = contentResults[contentId] || { files: [], status: 'pending', value: null };
            
            const newContentStatus = evaluateStatus(value, content.standardLevel, currentContentData.files, true);

            contentResults[contentId] = {
                ...currentContentData,
                value: value,
                status: newContentStatus,
            };

            const newIndicatorStatus = evaluateIndicatorByPassRule(indicator, contentResults);
            
            newData[indicatorId] = {
                ...newData[indicatorId],
                contentResults: contentResults,
                status: newIndicatorStatus
            };

        } else { // Updating a simple indicator
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
        }

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
        if (contentId) {
             const contentResults = { ...(newData[indicatorId].contentResults || {}) };
             if(contentResults[contentId]) {
                 contentResults[contentId].note = note;
                 newData[indicatorId] = { ...newData[indicatorId], contentResults };
             }
        } else {
            newData[indicatorId] = {
                ...newData[indicatorId],
                note: note,
            };
        }
        return newData;
    });
}, []);

const handleEvidenceChange = useCallback(async (indicatorId: string, newFiles: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus, contentId?: string) => {
    if (fileToRemove?.url) {
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
            return; // Ngăn không cập nhật state nếu xóa file lỗi
        }
    }

    setAssessmentData(prev => {
        const newData = { ...prev };
        const item = findIndicator(indicatorId) as Indicator | Content | null;
        if (!item) return prev;

        const indicatorData = { ...newData[indicatorId] };
        
        let fileList: FileWithStatus[];
        let currentValue: any;

        // Ưu tiên khối này nếu có docIndex
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

        // Chỉ chạy khối này nếu CHỈ CÓ contentId (không có docIndex)
        } else if (contentId && docIndex === undefined) {
             const content = (item as Indicator).contents?.find(c => c.id === contentId);
             if (!content) return prev;
             const contentResults = { ...(indicatorData.contentResults || {}) };
             const contentData = { ...(contentResults[contentId] || { files: [], status: 'pending', value: null }) };
             fileList = [...(contentData.files || [])];
             currentValue = contentData.value;
             
             if (fileToRemove) {
                fileList = fileList.filter(f => f.name !== fileToRemove.name);
             } else {
                fileList.push(...newFiles);
             }

             const newContentStatus = evaluateStatus(currentValue, content.standardLevel, fileList, true);
             contentResults[contentId] = { ...(contentResults[contentId] || { value: null }), files: fileList, status: newContentStatus };
             indicatorData.contentResults = contentResults;
             indicatorData.status = evaluateIndicatorByPassRule(item as Indicator, contentResults);
        
        } else {
            // Logic cho các chỉ tiêu/content đơn giản
            fileList = [...(indicatorData.files || [])];
            currentValue = indicatorData.value;
             if (fileToRemove) {
                fileList = fileList.filter(f => f.name !== fileToRemove.name);
             } else {
                fileList.push(...newFiles);
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
}, [activePeriod, currentUser, storage, assessmentData, assessments, updateSingleAssessment, toast]);

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
        
        if (indicator.contents && indicator.contents.length > 0) {
            if (data.status === 'pending') allItemsAssessed = false;
            
            for(const content of indicator.contents) {
                const contentResult = data.contentResults?.[content.id];
                if (!contentResult || contentResult.status === 'pending') {
                    allItemsAssessed = false;
                }
                checkEvidence(contentResult || { status: 'pending'}, content.name, false);
            }
        } else {
            if (data.status === 'pending') allItemsAssessed = false;
            const parentCriterion = criteria.find(c => c.indicators.some(i => i.id === id));
            const isCriterion1 = parentCriterion?.id === 'TC01' || (parentCriterion?.id === 'TC02' && id === 'CT033278');
            checkEvidence(data, indicator.name, isCriterion1);
        }
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

  const calculateCriterionStatus = (criterion: Criterion): AssessmentStatus => {
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
        if (!assessmentData[indicator.id] || !assessmentData[indicator.id].status) {
            return 'pending';
        }
        
        const status = assessmentData[indicator.id].status;
        
        if (status === 'not-achieved') {
            return 'not-achieved';
        }

        if (status === 'pending') {
            hasPending = true;
        }
    }

    if (hasPending) {
        return 'pending';
    }

    return 'achieved';
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

        // Dùng ID của tiêu chí để quyết định render component nào
        switch (criterion.id) {
            case 'TC01':
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
                    />
                );
            
            // TC02, TC03 và các TC khác sẽ dùng chung component Generic
            case 'TC02':
            case 'TC03':
            case 'TC04': // Thêm dự phòng cho TC04 nếu có
            case 'TC05': // Thêm dự phòng cho TC05 nếu có
            default:
                return (
                    <GenericCriterionComponent
                        key={criterion.id}
                        criterion={criterion}
                        criterionStatus={criterionStatus}
                        assessmentData={assessmentData}
                        onValueChange={handleValueChange}
                        onNoteChange={handleNoteChange}
                        onEvidenceChange={handleEvidenceChange}
                        onIsTaskedChange={handleIsTaskedChange}
                        onPreview={handlePreview}
                        criteria={criteria}
                        specialLogicIndicatorIds={specialLogicIndicatorIds}
                        getSpecialIndicatorLabels={getSpecialIndicatorLabels}
                        getCustomBooleanLabels={getCustomBooleanLabels}
                        getCheckboxOptions={getCheckboxOptions}
                        periodId={activePeriod!.id}
                        communeId={currentUser!.communeId}
                        handleCommuneDocsChange={handleCommuneDocsChange}
                        handleIsTaskedChange={handleIsTaskedChange}
                        updateSingleAssessment={(assessment) => updateSingleAssessment({ id: myAssessment?.id, ...assessment })}
                    />
                );
        }
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

    

    