
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Download, File as FileIcon, ThumbsDown, ThumbsUp, XCircle, AlertTriangle, Eye, MessageSquareQuote, UploadCloud, X, Clock, Award, Undo2, CornerDownRight, Edit, CircleSlash, LinkIcon } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useData } from "@/context/DataContext";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/layout/page-header";
import type { Assessment, IndicatorResult, Indicator, SubIndicator, Criterion } from '@/lib/data';
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Re-using the input rendering logic from the assessment page
const getSpecialLogicIndicatorIds = (criteria: Criterion[]): string[] => {
    if (!criteria || criteria.length < 3) return [];
    const firstCriterionIndicatorIds = (criteria[0]?.indicators || []).flatMap(i => i.subIndicators && i.subIndicators.length > 0 ? i.subIndicators.map(si => si.id) : [i.id]);
    const secondCriterion = criteria[1];
    let specialIdsFromSecondCriterion: string[] = [];
    if (secondCriterion.indicators?.length >= 2) { specialIdsFromSecondCriterion.push(secondCriterion.indicators[1].id); }
    if (secondCriterion.indicators?.length >= 3) { specialIdsFromSecondCriterion.push(secondCriterion.indicators[2].id); }
    if (secondCriterion.indicators?.length > 3 && secondCriterion.indicators[3].subIndicators?.length > 2) { specialIdsFromSecondCriterion.push(secondCriterion.indicators[3].subIndicators[2].id); }
    const thirdCriterion = criteria[2];
    let specialIdsFromThirdCriterion: string[] = [];
    if (thirdCriterion.indicators?.length > 0 && thirdCriterion.indicators[0].subIndicators?.length > 0) { specialIdsFromThirdCriterion.push(thirdCriterion.indicators[0].subIndicators[0].id); }
    if (thirdCriterion.indicators?.length > 0 && thirdCriterion.indicators[0].subIndicators?.length > 1) { specialIdsFromThirdCriterion.push(thirdCriterion.indicators[0].subIndicators[1].id); }
    if (thirdCriterion.indicators?.length > 1 && thirdCriterion.indicators[1].subIndicators?.length > 0) { specialIdsFromThirdCriterion.push(thirdCriterion.indicators[1].subIndicators[0].id); }
    return [...firstCriterionIndicatorIds, ...specialIdsFromSecondCriterion, ...specialIdsFromThirdCriterion];
}
const getSpecialIndicatorLabels = (indicatorId: string, criteria: Criterion[]) => {
    if (!criteria || criteria.length < 3) return { no: 'Không được giao nhiệm vụ', yes: 'Được giao nhiệm vụ' };
    const indicator3_tc2_id = criteria[1].indicators?.length >= 3 ? criteria[1].indicators[2].id : null;
    const subIndicator3_tc2_i4_id = criteria[1].indicators?.length > 3 && criteria[1].indicators[3].subIndicators?.length > 2 ? criteria[1].indicators[3].subIndicators[2].id : null;
    const subIndicator1_tc3_i1_id = criteria[2].indicators?.length > 0 && criteria[2].indicators[0].subIndicators?.length > 0 ? criteria[2].indicators[0].subIndicators[0].id : null;
    const subIndicator2_tc3_i1_id = criteria[2].indicators?.length > 0 && criteria[2].indicators[0].subIndicators?.length > 1 ? criteria[2].indicators[0].subIndicators[1].id : null;
    const subIndicator1_tc3_i2_id = criteria[2].indicators?.length > 1 && criteria[2].indicators[1].subIndicators?.length > 0 ? criteria[2].indicators[1].subIndicators[0].id : null;
    if (indicatorId === indicator3_tc2_id) { return { no: "Không yêu cầu cung cấp", yes: "Có yêu cầu cung cấp" }; }
    if (indicatorId === subIndicator3_tc2_i4_id) { return { no: "Không phát sinh nhiệm vụ ngoài kế hoạch", yes: "Có phát sinh nhiệm vụ ngoài kế hoạch" }; }
    if (indicatorId === subIndicator1_tc3_i1_id) { return { no: "Không phát sinh yêu cầu thành lập", yes: "Có phát sinh yêu cầu thành lập" }; }
    if (indicatorId === subIndicator2_tc3_i1_id) { return { no: "Không phát sinh yêu cầu kiện toàn, công nhận, cho thôi hòa giải viên", yes: "Có phát sinh yêu cầu kiện toàn, công nhận, cho thôi hòa giải viên" }; }
    if (indicatorId === subIndicator1_tc3_i2_id) { return { no: "Không phát sinh vụ, việc hòa giải", yes: "Có phát sinh vụ, việc hòa giải" }; }
    return { no: 'Không được giao nhiệm vụ', yes: 'Được giao nhiệm vụ' };
}
const getCustomBooleanLabels = (indicatorId: string, criteria: Criterion[]) => {
    if (!criteria || criteria.length < 2) return null;
    const criterion2 = criteria[1];
    if (criterion2.indicators?.length > 3 && criterion2.indicators[3].subIndicators?.length > 0) {
        const subIndicator1_tc2_i4_id = criterion2.indicators[3].subIndicators[0].id;
        if (indicatorId === subIndicator1_tc2_i4_id) { return { true: 'Ban hành đúng thời hạn', false: 'Ban hành không đúng thời hạn' }; }
    }
    return null;
}
const getCheckboxOptions = (indicatorId: string, criteria: Criterion[]) => {
    if (!criteria || criteria.length < 3) return null;
    const criterion2 = criteria[1]; const criterion3 = criteria[2];
    if (criterion2.indicators?.length > 4 && indicatorId === criterion2.indicators[4].id) { return ["Tổ chức cuộc thi tìm hiểu pháp luật trực tuyến", "Tổ chức tập huấn phổ biến kiến thức pháp luật và kỹ năng phổ biến, giáo dục pháp luật cho đội ngũ nhân lực làm công tác phổ biến, giáo dục pháp luật bằng hình thức trực tuyến", "Phổ biến, giáo dục pháp luật trên Cổng Thông tin điện tử/Trang Thông tin điện tử của Hội đồng nhân dân, Uỷ ban nhân dân cấp xã và có sự kết nối với Cổng Pháp luật Quốc gia (đối với cấp xã đã có Cổng/Trang thông tin điện tử)", "Sử dụng mạng xã hội và các nền tảng cộng đồng trực tuyến khác để thực hiện phổ biến, giáo dục pháp luật", "Xây dựng, số hoá các tài liệu, sản phẩm truyền thông, phổ biến, giáo dục pháp luật như video clip, podcast, audio...", "Xây dựng chatbox giải đáp pháp luật", "Phổ biến, giáo dục pháp luật thông qua tin nhắn điện thoại", "Hoạt động khác về chuyển đổi số, ứng dụng công nghệ số bảo đảm phù hợp"]; }
    if(criterion3.indicators?.length > 2 && indicatorId === criterion3.indicators[2].id) { return ["Huy động đội ngũ luật sư, luật gia, Hội thẩm nhân dân, lực lượng Công an nhân dân, Bộ đội Biên phòng, báo cáo viên pháp luật, tuyên truyền viên pháp luật, lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở, người đã từng là Thẩm phán, Kiểm sát viên, Điều tra viên, người đã hoặc đang công tác trong lĩnh vực pháp luật tham gia làm hòa giải viên ở cơ sở.", "Huy động đội ngũ nêu trên hỗ trợ pháp lý, tư vấn cho tổ hoà giải để giải quyết vụ, việc thuộc phạm vi hoà giải ở cơ sở.", "Huy động đội ngũ nêu trên tham gia tập huấn, bồi dưỡng cho hoà giải viên.", "Các hoạt động phối hợp, hỗ trợ hiệu quả của cá nhân, tổ chức khác trong triển khai công tác hòa giải ở cơ sở."]; }
    return null;
}

// Dialog for commune staff to revise an indicator
function RevisionDialog({ indicator, data, onSave, onCancel, criteria }: { indicator: Indicator | SubIndicator, data: IndicatorResult, onSave: (id: string, newData: IndicatorResult) => void, onCancel: () => void, criteria: Criterion[] }) {
    const [value, setValue] = useState(data.value);
    const [isTasked, setIsTasked] = useState(data.isTasked);
    const [note, setNote] = useState(data.communeNote || ''); // Use the new communeNote field
    const [files, setFiles] = useState<(File | { name: string, url: string })[]>(data.files || []);

    const specialLogicIndicatorIds = getSpecialLogicIndicatorIds(criteria);
    
    const handleSave = () => {
        onSave(indicator.id, { ...data, value, isTasked, communeNote: note, files });
        onCancel();
    };

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Bổ sung &amp; Giải trình: {indicator.name}</DialogTitle>
                <DialogDescription>Cập nhật lại kết quả tự đánh giá, tệp minh chứng và giải trình lý do.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
                {/* Re-render the input component from self-assessment */}
                <div className="grid gap-2">
                    <Label>Kết quả tự đánh giá mới</Label>
                    {renderInput(indicator, specialLogicIndicatorIds, getSpecialIndicatorLabels(indicator.id, criteria), getCustomBooleanLabels(indicator.id, criteria), getCheckboxOptions(indicator.id, criteria), { ...data, value, isTasked }, (id, val) => setValue(val), (id, tasked) => setIsTasked(tasked))}
                </div>
                {/* File Upload */}
                <div className="grid gap-2">
                    <Label>Hồ sơ minh chứng mới (nếu có)</Label>
                    <EvidenceUploaderComponent indicatorId={indicator.id} evidence={files} onEvidenceChange={(id, newFiles) => setFiles(newFiles)} />
                </div>
                {/* Commune's Explanation */}
                <div className="grid gap-2">
                    <Label htmlFor={`commune-note-${indicator.id}`}>Nội dung giải trình của bạn</Label>
                    <Textarea id={`commune-note-${indicator.id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Giải trình về sự thay đổi, bổ sung..." />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Hủy</Button>
                <Button onClick={handleSave}>Lưu thay đổi</Button>
            </DialogFooter>
        </DialogContent>
    );
}

// Input rendering logic copied from self-assessment page
function renderInput(indicator: Indicator | SubIndicator, specialIndicatorIds: string[], specialLabels: { no: string; yes: string }, customBooleanLabels: { true: string, false: string } | null, checkboxOptions: string[] | null, data: any, onValueChange: (id: string, value: any) => void, onIsTaskedChange: (id: string, isTasked: boolean) => void ) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onValueChange(indicator.id, e.target.value);
    const handleRadioChange = (val: string) => onValueChange(indicator.id, val === 'true');
    const handleCheckboxChange = (option: string, checked: boolean) => { const newValue = { ...((data.value as object) || {}), [option]: checked }; onValueChange(indicator.id, newValue); };
    if (checkboxOptions) { return ( <div className="grid gap-3"> {checkboxOptions.map((option, index) => ( <div key={index} className="flex items-center space-x-2"> <Checkbox id={`${indicator.id}-check-${index}`} checked={data.value?.[option] || false} onCheckedChange={(checked) => handleCheckboxChange(option, !!checked)} /> <Label htmlFor={`${indicator.id}-check-${index}`} className="font-normal">{option}</Label> </div> ))} </div> ) }
    if (specialIndicatorIds.includes(indicator.id)) { return ( <RadioGroup onValueChange={(val) => onIsTaskedChange(indicator.id, val === 'true')} value={data.isTasked === true ? 'true' : data.isTasked === false ? 'false' : ''} className="grid gap-2"> <div className="flex items-center space-x-2"> <RadioGroupItem value="false" id={`${indicator.id}-notask`} /> <Label htmlFor={`${indicator.id}-notask`}>{specialLabels.no}</Label> </div> <div className="flex items-center space-x-2"> <RadioGroupItem value="true" id={`${indicator.id}-hastask`} /> <Label htmlFor={`${indicator.id}-hastask`}>{specialLabels.yes}</Label> </div> {data.isTasked === true && ( <div className="grid gap-2 pl-6 pt-2"> <Label htmlFor={`${indicator.id}-input`}>Tỷ lệ hoàn thành nhiệm vụ (%)</Label> <Input id={`${indicator.id}-input`} type="number" placeholder="Nhập tỷ lệ %" value={data.value || ''} onChange={handleChange} /> </div> )} </RadioGroup> ) }
    switch (indicator.inputType) {
        case 'boolean': { const trueLabel = customBooleanLabels ? customBooleanLabels.true : 'Đạt'; const falseLabel = customBooleanLabels ? customBooleanLabels.false : 'Không đạt'; return ( <RadioGroup onValueChange={handleRadioChange} value={data.value === true ? 'true' : data.value === false ? 'false' : ''} className="grid gap-2"> <div className="flex items-center space-x-2"> <RadioGroupItem value="true" id={`${indicator.id}-true`} /> <Label htmlFor={`${indicator.id}-true`}>{trueLabel}</Label> </div> <div className="flex items-center space-x-2"> <RadioGroupItem value="false" id={`${indicator.id}-false`} /> <Label htmlFor={`${indicator.id}-false`}>{falseLabel}</Label> </div> </RadioGroup> ); }
        case 'number': return ( <div className="grid gap-2"> <Label htmlFor={`${indicator.id}-input`}>Tỷ lệ (%) hoặc số lượng</Label> <Input id={`${indicator.id}-input`} type="number" placeholder="Nhập giá trị" value={data.value || ''} onChange={handleChange} /> </div> );
        case 'select': return ( <div className="grid gap-2"> <div className="flex items-center space-x-2"> <Checkbox id={`${indicator.id}-check1`} /> <Label htmlFor={`${indicator.id}-check1`}>Có giao diện thân thiện</Label> </div> <div className="flex items-center space-x-2"> <Checkbox id={`${indicator.id}-check2`} /> <Label htmlFor={`${indicator.id}-check2`}>Cập nhật thông tin thường xuyên</Label> </div> </div> );
        case 'text': default: return ( <div className="grid gap-2"> <Label htmlFor={`${indicator.id}-input`}>Kết quả</Label> <Input id={`${indicator.id}-input`} type="text" placeholder="Nhập kết quả" value={data.value || ''} onChange={handleChange} /> </div> );
    }
}

function EvidenceUploaderComponent({ indicatorId, evidence, onEvidenceChange }: { indicatorId: string; evidence: (File | { name: string, url: string })[]; onEvidenceChange: (id: string, evidence: (File | { name: string, url: string })[]) => void; }) {
    const {toast} = useToast();
    const [linkInput, setLinkInput] = useState('');

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files || []);
        onEvidenceChange(indicatorId, [...evidence, ...newFiles]);
    };
    const handleEvidenceRemove = (itemToRemove: File | { name: string, url: string }) => {
        onEvidenceChange(indicatorId, evidence.filter(item => item.name !== itemToRemove.name));
    };
    const handleAddLink = () => {
        if (!linkInput.trim() || !linkInput.startsWith('http')) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập một đường dẫn hợp lệ.' });
            return;
        }
        onEvidenceChange(indicatorId, [...evidence, { name: linkInput.trim(), url: linkInput.trim() }]);
        setLinkInput('');
    };

    const isLink = (item: any): item is { name: string, url: string } => typeof item.url === 'string' && item.url.startsWith('http');
    
    return (
        <div className="grid gap-4">
             <div className="w-full relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-4 text-center hover:border-primary transition-colors">
                <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">
                    Kéo và thả tệp, hoặc <span className="font-semibold text-primary">nhấn để chọn</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Dung lượng tối đa: 5MB.</p>
                <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple onChange={handleFileSelect} />
            </div>
             <div className="grid gap-2">
                 <Label htmlFor={`link-${indicatorId}`} className="text-sm">Hoặc thêm liên kết minh chứng</Label>
                 <div className="flex gap-2">
                    <Input 
                        id={`link-${indicatorId}`}
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="Dán đường dẫn vào đây"
                    />
                    <Button type="button" variant="outline" onClick={handleAddLink}>Thêm</Button>
                 </div>
            </div>
            {evidence.length > 0 && (
                 <div className="space-y-2 mt-2">
                    {evidence.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                            <div className="flex items-center gap-2 truncate">
                                {isLink(item) ? <LinkIcon className="h-4 w-4 flex-shrink-0 text-blue-500" /> : <FileIcon className="h-4 w-4 flex-shrink-0" />}
                                <span className="truncate">{item.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEvidenceRemove(item)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                 </div>
            )}
        </div>
    );
}

const StatusBadge = ({ status }: { status: IndicatorResult['status'] }) => {
    switch (status) {
        case 'achieved':
            return <Badge variant="default" className="bg-green-600 text-white">Đạt</Badge>;
        case 'not-achieved':
            return <Badge variant="destructive">Không đạt</Badge>;
        case 'pending':
        default:
            return <Badge variant="secondary">Chưa chấm</Badge>;
    }
};

export default function AssessmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { role, units, assessments, updateAssessments, criteria, currentUser } = useData();
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<Assessment | undefined>(() => assessments.find((a) => a.id === id));
  const [previewFile, setPreviewFile] = useState<{name: string, url: string} | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [revisingIndicator, setRevisingIndicator] = useState<(Indicator | SubIndicator) | null>(null);

  // State to hold admin notes for each indicator
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>(() => {
    const initialNotes: Record<string, string> = {};
    if (assessment?.assessmentData) {
        for (const indicatorId in assessment.assessmentData) {
            initialNotes[indicatorId] = assessment.assessmentData[indicatorId].adminNote || '';
        }
    }
    return initialNotes;
  });

  // State for commune to manage their revisions
  const [revisionData, setRevisionData] = useState<Record<string, IndicatorResult>>({});
  
  useEffect(() => {
    const currentAssessment = assessments.find((a) => a.id === id);
    setAssessment(currentAssessment);
    if (currentAssessment?.assessmentData) {
        const initialNotes: Record<string, string> = {};
        for (const indicatorId in currentAssessment.assessmentData) {
            initialNotes[indicatorId] = currentAssessment.assessmentData[indicatorId].adminNote || '';
        }
        setAdminNotes(initialNotes);
        // Initialize revision data when component loads
        setRevisionData(JSON.parse(JSON.stringify(currentAssessment.assessmentData))); // Deep copy
    }
  }, [assessments, id]);
  
  const handleAdminNoteChange = (indicatorId: string, text: string) => {
    setAdminNotes(prev => ({ ...prev, [indicatorId]: text }));
  }

  const getUnitName = (unitId: string | undefined) => {
    if (!unitId) return "Không xác định";
    return units.find(u => u.id === unitId)?.name || "Không xác định";
  }

  if (!assessment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Không tìm thấy</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Không tìm thấy hồ sơ đánh giá với ID này.</p>
        </CardContent>
      </Card>
    );
  }
  
  const assessmentUnitName = getUnitName(assessment.communeId);

  const handleApprove = async () => {
    const updatedAssessment = { ...assessment, assessmentStatus: 'achieved_standard' as const, approvalDate: new Date().toLocaleDateString('vi-VN'), approverId: currentUser?.id };
    await updateAssessments(assessments.map(a => a.id === id ? updatedAssessment : a));
    
    toast({
      title: "Phê duyệt thành công!",
      description: `Đã công nhận ${assessmentUnitName} đạt chuẩn.`,
      className: "bg-green-100 border-green-400 text-green-800",
    });
    router.push('/admin/reviews');
  };

  const handleReject = async () => {
    const updatedAssessment = { ...assessment, assessmentStatus: 'rejected' as const, assessmentRejectionReason: "" };
    await updateAssessments(assessments.map(a => a.id === id ? updatedAssessment : a));
    
    toast({
      title: "Đã từ chối hồ sơ",
      description: `Hồ sơ của ${assessmentUnitName} đã được ghi nhận là "Không đạt chuẩn".`,
      variant: "destructive",
    });
    setIsRejectDialogOpen(false);
    router.push('/admin/reviews');
  };
  
  const handleResubmit = async () => {
      // Logic to upload new files needs to be added here if needed
      const updatedAssessment = { ...assessment, assessmentStatus: 'pending_review' as const, assessmentData: revisionData, assessmentSubmissionDate: new Date().toLocaleDateString('vi-VN') };
      await updateAssessments(assessments.map(a => a.id === id ? updatedAssessment : a));
      toast({
        title: "Gửi lại thành công",
        description: "Hồ sơ của bạn đã được gửi lại để xem xét."
      });
      router.push('/dashboard');
  }

  const getIndicatorResult = (indicatorId: string): IndicatorResult => {
    const revisedData = revisionData[indicatorId];
    if (revisedData) return revisedData;

    if (!assessment?.assessmentData || !assessment.assessmentData[indicatorId]) {
      return { value: 'Chưa chấm', note: 'Chưa có giải trình.', files: [], status: 'pending' };
    }
    return assessment.assessmentData[indicatorId];
  };

  const handleSaveRevision = (indicatorId: string, newData: IndicatorResult) => {
      setRevisionData(prev => ({...prev, [indicatorId]: newData}));
      toast({ title: "Đã lưu", description: `Đã cập nhật thay đổi cho chỉ tiêu.` });
  }

  
   const handleReturnForRevision = async () => {
        const assessmentDataWithNotes = { ...assessment.assessmentData };
        for (const indicatorId in adminNotes) {
            if (assessmentDataWithNotes[indicatorId]) {
                assessmentDataWithNotes[indicatorId].adminNote = adminNotes[indicatorId];
            } else {
                 assessmentDataWithNotes[indicatorId] = { value: null, note: '', files: [], status: 'pending', adminNote: adminNotes[indicatorId] };
            }
        }
        
        const updatedAssessment = { ...assessment, assessmentStatus: 'returned_for_revision' as const, assessmentData: assessmentDataWithNotes, };
        await updateAssessments(assessments.map((a) => (a.id === id ? updatedAssessment : a)));
        toast({ title: 'Đã trả lại hồ sơ', description: `Đã gửi yêu cầu bổ sung cho ${assessmentUnitName}.`, });
        setIsReturnDialogOpen(false);
        router.push('/admin/reviews');
    };

  const renderResultValue = (result: IndicatorResult) => {
    if (result.isTasked === false) { return <Badge variant="secondary">Không được giao nhiệm vụ</Badge>; }
    const { value } = result;
    if (typeof value === 'boolean') { return <Badge variant={value ? 'default' : 'destructive'} className={value ? 'bg-green-600' : ''}>{value ? 'Đạt' : 'Không đạt'}</Badge>; }
    if (typeof value === 'number') { return <Badge variant="outline">{`${value}%`}</Badge>; }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const selectedOptions = Object.entries(value).filter(([, isChecked]) => isChecked).map(([option]) => option);
        if (selectedOptions.length === 0) { return <p className="text-sm text-muted-foreground">Không có lựa chọn nào.</p>; }
        return ( <ul className="list-disc pl-5 space-y-1"> {selectedOptions.map((opt, i) => <li key={i} className="text-sm">{opt}</li>)} </ul> )
    }
    if (value) { return <Badge variant="outline">{String(value)}</Badge>; }
    return <Badge variant="secondary">Chưa có dữ liệu</Badge>;
  };

    const isActionDisabled = assessment.assessmentStatus === 'achieved_standard' || (role === 'admin' && assessment.assessmentStatus === 'rejected');
    const isReturnedForRevision = assessment.assessmentStatus === 'returned_for_revision';

    const isLink = (item: any): item is { name: string, url: string } => typeof item.url === 'string' && (item.url.startsWith('http://') || item.url.startsWith('https://'));

  const badgeMap = {
      pending_review: { text: 'Chờ duyệt', icon: Clock, className: 'bg-amber-500' },
      returned_for_revision: { text: 'Đã trả lại', icon: Undo2, className: 'bg-amber-600' },
      rejected: { text: 'Không đạt chuẩn', icon: XCircle, className: 'bg-red-500' },
      achieved_standard: { text: 'Đạt chuẩn', icon: Award, className: 'bg-blue-600' },
      draft: { text: 'Bản nháp', icon: Edit, className: 'bg-gray-500' },
      not_started: { text: 'Chưa bắt đầu', icon: FileIcon, className: 'bg-gray-400' },
  };
  const currentStatusInfo = badgeMap[assessment.assessmentStatus as keyof typeof badgeMap];


  return (
    <>
    <PageHeader title="Chi tiết Hồ sơ Đánh giá" description={`Đơn vị: ${assessmentUnitName} | Ngày nộp: ${assessment.assessmentSubmissionDate}`}/>
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1"></div>
            {currentStatusInfo && (
              <Badge variant='default' className={cn(currentStatusInfo.className, 'text-white')}>
                <currentStatusInfo.icon className="mr-2 h-4 w-4" />
                {currentStatusInfo.text}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Separator className="mb-6" />
          <Accordion type="multiple" defaultValue={criteria.map(c => c.id)} className="w-full">
            {criteria.map((criterion, index) => (
              <AccordionItem value={criterion.id} key={criterion.id}>
                <AccordionTrigger className="text-lg font-headline hover:no-underline">
                  Tiêu chí {index + 1}: {criterion.name.replace(`Tiêu chí ${index + 1}: `, '')}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pl-8 pr-4">
                    {criterion.indicators.map(indicator => {
                      const renderIndicatorContent = (ind: typeof indicator | (typeof indicator.subIndicators)[0], isSub: boolean) => {
                        const result = getIndicatorResult(ind.id);
                        const adminNote = adminNotes[ind.id] || '';
                        
                        const blockClasses = cn(
                          "grid gap-4 p-4 rounded-lg bg-card border shadow-sm",
                          result.status === 'achieved' && 'bg-green-50 border-green-200',
                          result.status === 'not-achieved' && 'bg-red-50 border-red-200',
                          isSub && "relative pl-6 pt-4 mt-2"
                        );

                        return (
                          <div key={ind.id} className={blockClasses}>
                              {isSub && <CornerDownRight className="absolute -left-3 top-5 h-5 w-5 text-muted-foreground"/>}
                              <div className="flex items-start gap-3">
                                  <StatusBadge status={result.status} />
                                  <h4 className="font-semibold flex-1">{ind.name}</h4>
                              </div>
                               <>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1 font-medium text-muted-foreground">Kết quả tự chấm:</div>
                                    <div className="md:col-span-2 font-semibold"> {renderResultValue(result)} </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1 font-medium text-muted-foreground">Giải trình ban đầu:</div>
                                    <p className="md:col-span-2 text-sm">{result.note || "Không có giải trình."}</p>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1 font-medium text-muted-foreground">Minh chứng ban đầu:</div>
                                    <div className="md:col-span-2">
                                      {result.files.length > 0 ? (
                                        <div className="space-y-2">
                                          {result.files.map((file: {name: string, url: string}, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                                              <div className="flex items-center gap-2 truncate">
                                                {isLink(file) ? <LinkIcon className="h-4 w-4 flex-shrink-0 text-blue-500"/> : <FileIcon className="h-4 w-4 flex-shrink-0" />}
                                                <span className="truncate">{file.name}</span>
                                              </div>
                                              <div className="flex items-center">
                                                {isLink(file) ? (
                                                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                    <a href={file.url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a>
                                                  </Button>
                                                ) : (
                                                  <>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewFile(file)}> <Eye className="h-4 w-4" /> </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(file.url, '_blank')}><Download className="h-4 w-4" /></Button>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : ( <p className="text-sm text-muted-foreground">Không có tệp đính kèm.</p> )}
                                    </div>
                                  </div>
                                </>

                                {result.communeNote && (
                                     <div className="mt-4 p-4 border-t border-dashed border-blue-500 bg-blue-50/50 rounded-b-lg grid gap-2">
                                        <Label className="font-semibold text-blue-800">Giải trình bổ sung của xã:</Label>
                                        <p className="text-sm text-blue-900 whitespace-pre-wrap">{result.communeNote}</p>
                                    </div>
                                )}

                                { (role === 'admin' || (role === 'commune_staff' && result.adminNote)) &&
                                  <div className="mt-4 p-4 border-t border-dashed border-amber-500 bg-amber-50/50 rounded-b-lg grid gap-4">
                                     {role === 'admin' ? (
                                        <>
                                            <Label htmlFor={`admin-note-${ind.id}`} className="font-semibold text-amber-800">Ghi chú của Admin cho chỉ tiêu này</Label>
                                            <Textarea id={`admin-note-${ind.id}`} placeholder="Nhập ghi chú, yêu cầu chỉnh sửa..." value={adminNote} onChange={(e) => handleAdminNoteChange(ind.id, e.target.value)} />
                                        </>
                                     ) : (
                                        <>
                                            <Label className="font-semibold text-amber-800">Ghi chú của Admin:</Label>
                                            {result.adminNote ? <p className="text-sm text-amber-900 whitespace-pre-wrap">{result.adminNote}</p> : <p className="text-sm text-muted-foreground">Không có ghi chú.</p>}
                                            {isReturnedForRevision && (
                                                <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={() => setRevisingIndicator(ind)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Bổ sung &amp; Giải trình
                                                </Button>
                                            )}
                                        </>
                                     )}
                                  </div>
                                }
                          </div>
                        )
                      }
                      
                      if (!indicator.subIndicators || indicator.subIndicators.length === 0) { return renderIndicatorContent(indicator, false); }
                      return (
                         <div key={indicator.id} className="grid gap-4">
                             <h4 className="font-semibold">{indicator.name}</h4>
                             <div className="pl-6 border-l-2 border-dashed space-y-4">
                                {indicator.subIndicators.map(sub => renderIndicatorContent(sub, true))}
                             </div>
                         </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {role === 'admin' && (assessment.assessmentStatus === 'pending_review' || assessment.assessmentStatus === 'returned_for_revision') && (
            <> <Separator className="my-6" /> <div className="grid gap-4"> <h3 className="text-lg font-headline">Thẩm định và Ra quyết định</h3> </div> </>
          )}

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
            
            {role === 'admin' && (assessment.assessmentStatus === 'pending_review' || assessment.assessmentStatus === 'returned_for_revision') &&(
              <>
                <Button variant="destructive" onClick={() => setIsRejectDialogOpen(true)} disabled={isActionDisabled}><ThumbsDown className="mr-2 h-4 w-4" />Từ chối (Không đạt)</Button>
                <Button variant="outline" className="text-amber-600 border-amber-500 hover:bg-amber-50 hover:text-amber-700" onClick={() => setIsReturnDialogOpen(true)} disabled={isActionDisabled} >
                    <Undo2 className="mr-2 h-4 w-4" /> Trả lại
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleApprove} disabled={isActionDisabled}><Award className="mr-2 h-4 w-4" />Phê duyệt (Đạt chuẩn)</Button>
              </>
            )}
            
            {role === 'commune_staff' && assessment.assessmentStatus === 'returned_for_revision' && (
                <>
                    <Button variant="outline">Lưu nháp giải trình</Button>
                    <Button onClick={handleResubmit}>Gửi lại đánh giá</Button>
                </>
            )}
        </CardFooter>
      </Card>
    </div>
    
    <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận Từ chối (Không Đạt)?</AlertDialogTitle>
                <AlertDialogDescription>
                    Hành động này sẽ đánh dấu hồ sơ của <strong>{assessmentUnitName}</strong> là "Không đạt chuẩn" trong kỳ đánh giá này. Đây là quyết định cuối cùng và không thể yêu cầu xã gửi lại.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={handleReject} className="bg-destructive hover:bg-destructive/90" > Xác nhận Không Đạt </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    <AlertDialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận Trả lại hồ sơ?</AlertDialogTitle>
                <AlertDialogDescription>
                   Bạn có chắc chắn muốn trả lại hồ sơ này để <strong>{assessmentUnitName}</strong> chỉnh sửa và bổ sung không? Các ghi chú bạn đã nhập sẽ được gửi kèm.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={handleReturnForRevision} className="bg-amber-600 hover:bg-amber-700">Xác nhận Trả lại</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <Dialog open={!!revisingIndicator} onOpenChange={(open) => !open && setRevisingIndicator(null)}>
        {revisingIndicator && (
            <RevisionDialog 
                indicator={revisingIndicator} 
                data={getIndicatorResult(revisingIndicator.id)}
                onSave={handleSaveRevision}
                onCancel={() => setRevisingIndicator(null)}
                criteria={criteria}
            />
        )}
    </Dialog>

    <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-0"> <DialogTitle>Xem trước: {previewFile?.name}</DialogTitle> </DialogHeader>
            <div className="flex-1 px-6 pb-6 h-full">
                {previewFile && ( <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(previewFile.url)}&embedded=true`} className="w-full h-full border rounded-md" title={previewFile.name} ></iframe> )}
            </div>
            <DialogFooter className="p-6 pt-0 border-t">
                <Button variant="secondary" onClick={() => window.open(previewFile?.url, '_blank')}><Download className="mr-2 h-4 w-4"/> Tải xuống</Button>
                <Button variant="outline" onClick={() => setPreviewFile(null)}>Đóng</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
